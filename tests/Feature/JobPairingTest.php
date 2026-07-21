<?php

namespace Tests\Feature;

use App\Models\AiRequest;
use App\Models\JobPairing;
use App\Models\Resume;
use App\Models\User;
use App\Services\JobPairingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class JobPairingTest extends TestCase
{
    use RefreshDatabase;

    private function service(): JobPairingService
    {
        return app(JobPairingService::class);
    }

    /** Seeds one moderation + chat pair per expected call; the fake is consumed in order. */
    private function fakeReplies(int $count): void
    {
        $responses = [];

        for ($i = 0; $i < $count; $i++) {
            $responses[] = ModerationResponse::fake(['results' => [['flagged' => false]]]);
            $responses[] = CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => 'Rewritten.']]],
                'usage' => ['prompt_tokens' => 5, 'completion_tokens' => 5, 'total_tokens' => 10],
            ]);
        }

        $this->app->instance(ClientContract::class, new ClientFake($responses));
    }

    private function fakeReply(string $content): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => $content]]],
                'usage' => ['prompt_tokens' => 5, 'completion_tokens' => 5, 'total_tokens' => 10],
            ]),
        ]));
    }

    /**
     * The whole point of dropping location from the key: one posting syndicated to
     * three boards renders its company three ways. If these split, the user is charged
     * three times for one job — the error the pricing model cannot afford.
     */
    public function test_same_job_from_different_sources_is_one_key(): void
    {
        $key = JobPairing::billingKey('Acme Inc.', 'Senior Product Manager');

        $this->assertSame($key, JobPairing::billingKey('Acme, Inc.', 'Senior Product Manager'));
        $this->assertSame($key, JobPairing::billingKey('ACME LLC', 'Senior Product Manager'));
        $this->assertSame($key, JobPairing::billingKey('  Acme   Inc  ', 'Senior  Product Manager'));
    }

    /** Distinct roles at one company must stay distinct, or under-charging goes too far. */
    public function test_different_titles_at_one_company_are_different_keys(): void
    {
        $this->assertNotSame(
            JobPairing::billingKey('Acme', 'Senior Product Manager'),
            JobPairing::billingKey('Acme', 'Staff Engineer'),
        );
    }

    /**
     * Documented ceiling, asserted so it stays a known limit rather than a surprise:
     * title-abbreviation folding is deliberately absent, so these still split.
     */
    public function test_abbreviated_titles_still_split(): void
    {
        $this->assertNotSame(
            JobPairing::billingKey('Acme', 'Sr. Product Manager'),
            JobPairing::billingKey('Acme', 'Senior Product Manager'),
        );
    }

    /** Resolving the same job twice must charge once — this is the double-charge fence. */
    public function test_resolving_the_same_job_twice_creates_one_pairing(): void
    {
        $user = User::factory()->create();

        $first = $this->service()->resolveForJob($user, 'Acme Inc.', 'Senior Product Manager');
        $second = $this->service()->resolveForJob($user, 'Acme, Inc.', 'Senior  Product Manager');

        $this->assertTrue($first->is($second));
        $this->assertSame(1, $user->jobPairings()->count());
        $this->assertSame(1, $user->balanceTransactions()->where('reason', 'charge')->count());
    }

    /** A blank company would normalize to a key shared by every unnamed job. */
    public function test_missing_company_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->service()->resolveForJob(User::factory()->create(), null, 'Senior Product Manager');
    }

    /** Pairings are per-user; one user's key must never resolve to another's row. */
    public function test_pairings_are_scoped_per_user(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();

        $alicePairing = $this->service()->resolveForJob($alice, 'Acme', 'Senior Product Manager');
        $bobPairing = $this->service()->resolveForJob($bob, 'Acme', 'Senior Product Manager');

        $this->assertFalse($alicePairing->is($bobPairing));
        $this->assertSame(1, $alice->jobPairings()->count());
        $this->assertSame(1, $bob->jobPairings()->count());
    }

    /** Non-job AI collapses into one reserved pairing, not one per call. */
    public function test_general_pairing_is_resolved_once(): void
    {
        $user = User::factory()->create();

        $first = $this->service()->resolveGeneral($user);
        $second = $this->service()->resolveGeneral($user);

        $this->assertTrue($first->is($second));
        $this->assertSame(JobPairing::GENERAL, $first->billing_key);
    }

    /** Instrumentation, not billing: nothing is charged while prices are 0. */
    public function test_prices_are_zero_so_no_balance_moves(): void
    {
        $user = User::factory()->create();

        $this->service()->resolveForJob($user, 'Acme', 'Senior Product Manager');

        $this->assertSame(0, $user->balanceCents());
        $this->assertSame(0, (int) $user->jobPairings()->sole()->price_cents);
    }

    /** The ledger, not a cached column, is the balance — and it debits once priced. */
    public function test_pairing_debits_the_ledger_when_priced(): void
    {
        config()->set('pricing.job_cents', 50);

        $user = User::factory()->create();
        $user->balanceTransactions()->create(['amount_cents' => 500, 'reason' => 'signup_grant']);

        $this->service()->resolveForJob($user, 'Acme', 'Senior Product Manager');

        $this->assertSame(450, $user->balanceCents());
    }

    /** A refunded job must be buyable again — the partial unique index allows it. */
    public function test_refunded_pairing_can_be_repurchased(): void
    {
        $user = User::factory()->create();

        $first = $this->service()->resolveForJob($user, 'Acme', 'Senior Product Manager');
        $first->update(['refunded_at' => now()]);

        $second = $this->service()->resolveForJob($user, 'Acme', 'Senior Product Manager');

        $this->assertFalse($first->is($second));
        $this->assertSame(2, $user->jobPairings()->count());
    }

    /** The refund window closes on the first success, so output can never be kept for free. */
    public function test_pairing_stops_being_refundable_after_a_successful_call(): void
    {
        $user = User::factory()->create();
        $pairing = $this->service()->resolveForJob($user, 'Acme', 'Senior Product Manager');

        $this->assertTrue($pairing->isRefundable());

        AiRequest::create([
            'user_id' => $user->id,
            'job_pairing_id' => $pairing->id,
            'model' => 'gpt-4o-mini',
            'status' => 'success',
        ]);

        $this->assertFalse($pairing->fresh()->isRefundable());
    }

    /**
     * The wiring that makes any of this measurable: a real AI call through the builder
     * must record which job it was for. Without this the pairings table stays empty and
     * §12's numbers cannot be collected.
     */
    public function test_ai_call_records_a_pairing_for_the_resume_target(): void
    {
        $this->fakeReply('Led a team of five engineers to ship X.');
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'target_company' => 'Acme, Inc.',
            'target_title' => 'Senior Product Manager',
        ]);

        $this->actingAs($user)
            ->postJson(route('builder.ai.rewrite-bullet', $resume), ['text' => 'managed a team'])
            ->assertOk();

        $this->assertSame('acme|senior product manager', $user->jobPairings()->sole()->billing_key);
    }

    /** Two jobs tailored means two pairings — this is what "jobs tailored" counts. */
    public function test_two_targets_produce_two_pairings(): void
    {
        $user = User::factory()->create();
        $this->fakeReplies(2);

        foreach ([['Acme', 'Senior Product Manager'], ['Globex', 'Staff Engineer']] as [$company, $title]) {
            $resume = Resume::factory()->for($user)->create([
                'target_company' => $company,
                'target_title' => $title,
            ]);

            $this->actingAs($user)
                ->postJson(route('builder.ai.rewrite-bullet', $resume), ['text' => 'managed a team'])
                ->assertOk();
        }

        $this->assertSame(2, $user->jobPairings()->count());
    }

    /** An untargeted resume falls into __general__ rather than vanishing from the data. */
    public function test_ai_call_without_a_target_falls_into_general(): void
    {
        $this->fakeReply('Rewritten.');
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'target_company' => null,
            'target_title' => null,
        ]);

        $this->actingAs($user)
            ->postJson(route('builder.ai.rewrite-bullet', $resume), ['text' => 'managed a team'])
            ->assertOk();

        $this->assertSame(JobPairing::GENERAL, $user->jobPairings()->sole()->billing_key);
    }

    /** A user must never lose the refund window to our outage or a moderation block. */
    public function test_failed_and_flagged_calls_leave_the_window_open(): void
    {
        $user = User::factory()->create();
        $pairing = $this->service()->resolveForJob($user, 'Acme', 'Senior Product Manager');

        foreach (['error', 'flagged'] as $status) {
            AiRequest::create([
                'user_id' => $user->id,
                'job_pairing_id' => $pairing->id,
                'model' => 'gpt-4o-mini',
                'status' => $status,
            ]);
        }

        $this->assertTrue($pairing->fresh()->isRefundable());
    }

    /**
     * A pairing is the billable unit, so it must only exist once the user has been
     * served something. Prices are 0 today, which is exactly why this needs a test:
     * a pairing recorded for a request that never ran is invisible now and becomes a
     * charge for nothing the moment PRICING_JOB_CENTS moves off zero.
     */
    public function test_a_quota_rejected_call_records_no_pairing(): void
    {
        $user = User::factory()->create(['ai_blocked' => true]);
        $resume = Resume::factory()->for($user)->create([
            'target_company' => 'Acme',
            'target_title' => 'Senior Product Manager',
        ]);

        $this->actingAs($user)
            ->postJson(route('builder.ai.rewrite-bullet', $resume), ['text' => 'managed a team'])
            ->assertStatus(402);

        $this->assertSame(0, $user->jobPairings()->count());
    }

    /** Same rule for a moderation block: nothing was generated, so nothing is billable. */
    public function test_a_moderation_blocked_call_records_no_pairing(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => true]]]),
        ]));

        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'target_company' => 'Acme',
            'target_title' => 'Senior Product Manager',
        ]);

        $this->actingAs($user)
            ->postJson(route('builder.ai.rewrite-bullet', $resume), ['text' => 'managed a team'])
            ->assertStatus(422);

        $this->assertSame(0, $user->jobPairings()->count());
    }

    /**
     * The coach is per-job work, so its spend has to land on the same pairing the
     * builder uses — otherwise §12's "median jobs tailored" undercounts every user who
     * prepped for an interview, and the two features bill the same job twice.
     */
    public function test_interview_coaching_joins_the_resume_target_pairing(): void
    {
        $this->fakeReply('["Tell me about a time you shipped under pressure."]');

        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'target_company' => 'Acme',
            'target_title' => 'Senior Product Manager',
        ]);

        $this->actingAs($user)
            ->postJson(route('builder.interview-coach', $resume), [
                'target_role' => 'Senior Product Manager',
            ])
            ->assertOk();

        // The key, not the count: a __general__ pairing would also make a count of 1 pass
        // while still undercounting the job.
        $this->assertSame(
            'acme|senior product manager',
            $user->jobPairings()->sole()->billing_key,
        );
    }
}
