<?php

namespace Tests\Feature;

use App\Models\AiCreditLedgerEntry;
use App\Models\QaBankEntry;
use App\Models\StarterProfile;
use App\Models\User;
use App\Services\AiCreditService;
use App\Services\AiUsageLimiter;
use GuzzleHttp\Psr7\Response as PsrResponse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Sleep;
use Laravel\Cashier\Events\WebhookReceived;
use OpenAI\Exceptions\ErrorException;
use OpenAI\Exceptions\ServerException;
use OpenAI\Laravel\Facades\OpenAI;
use OpenAI\Responses\Chat\CreateResponse;
use Tests\Concerns\CreatesCashierSubscription;
use Tests\TestCase;

/**
 * Credits are debited before the model call (reserve-then-settle) so that
 * concurrent requests cannot all pass a stale balance check and overdraw.
 */
class AiCreditReservationTest extends TestCase
{
    use CreatesCashierSubscription;
    use RefreshDatabase;

    private function subscribedUserWithCredits(int $credits): User
    {
        $user = User::factory()->create();
        $this->subscribeUser($user);
        app(AiCreditService::class)->grant($user, $credits, 'admin');

        return $user;
    }

    private function draftableEntry(User $user): QaBankEntry
    {
        $profile = StarterProfile::factory()->for($user)->create();

        return QaBankEntry::factory()->for($profile)->create(['question' => 'Why this role?']);
    }

    public function test_second_reservation_is_refused_once_balance_is_spent(): void
    {
        $user = $this->subscribedUserWithCredits(3);
        $limiter = app(AiUsageLimiter::class);

        $first = $limiter->reserve($user, 3, 'resume_review');
        $second = $limiter->reserve($user, 3, 'resume_review');

        $this->assertInstanceOf(AiCreditLedgerEntry::class, $first);
        $this->assertSame(402, $second);
        $this->assertSame(0, app(AiCreditService::class)->balance($user));
    }

    public function test_blocked_user_reservation_is_refused_with_429_and_debits_nothing(): void
    {
        $user = $this->subscribedUserWithCredits(5);
        $user->forceFill(['ai_blocked' => true])->save();

        $this->assertSame(429, app(AiUsageLimiter::class)->reserve($user, 1, 'qa_bank_draft'));
        $this->assertSame(5, app(AiCreditService::class)->balance($user));
    }

    public function test_failed_model_call_refunds_the_reserved_credit_and_returns_502(): void
    {
        Sleep::fake();
        $user = $this->subscribedUserWithCredits(1);
        $entry = $this->draftableEntry($user);

        OpenAI::fake([
            new ErrorException(['message' => 'bad request'], new PsrResponse(400)),
        ]);

        $this->actingAs($user)
            ->postJson(route('qa-bank-entries.draft', $entry))
            ->assertStatus(502);

        $this->assertSame(1, app(AiCreditService::class)->balance($user));
        // Append-only: the debit stays and a compensating refund row is added.
        $this->assertDatabaseHas('ai_credit_ledger', ['user_id' => $user->id, 'amount' => -1, 'reason' => 'spend']);
        $this->assertDatabaseHas('ai_credit_ledger', ['user_id' => $user->id, 'amount' => 1, 'reason' => 'refund']);
    }

    public function test_successful_draft_links_the_debit_to_its_ai_request(): void
    {
        $user = $this->subscribedUserWithCredits(1);
        $entry = $this->draftableEntry($user);

        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [['message' => ['role' => 'assistant', 'content' => 'Because of the mission.']]],
            ]),
        ]);

        $this->actingAs($user)->postJson(route('qa-bank-entries.draft', $entry))->assertOk();

        $debit = AiCreditLedgerEntry::where('user_id', $user->id)->where('reason', 'spend')->sole();
        $this->assertNotNull($debit->ai_request_id);
        $this->assertSame(0, app(AiCreditService::class)->balance($user));

        // Balance now exhausted: the next draft is refused before any model call.
        $this->actingAs($user)->postJson(route('qa-bank-entries.draft', $entry))->assertStatus(402);
        $this->assertSame(0, app(AiCreditService::class)->balance($user));
    }

    public function test_transient_upstream_error_is_retried_once(): void
    {
        Sleep::fake();
        $user = $this->subscribedUserWithCredits(1);
        $entry = $this->draftableEntry($user);

        OpenAI::fake([
            new ServerException(new PsrResponse(503)),
            CreateResponse::fake([
                'choices' => [['message' => ['role' => 'assistant', 'content' => 'Second try.']]],
            ]),
        ]);

        $this->actingAs($user)
            ->postJson(route('qa-bank-entries.draft', $entry))
            ->assertOk()
            ->assertJson(['draft' => 'Second try.']);
    }

    /**
     * @param  array<string, mixed>  $object
     */
    private function dispatchSubscriptionWebhook(string $type, array $object): void
    {
        WebhookReceived::dispatch(['type' => $type, 'data' => ['object' => $object]]);
    }

    public function test_incomplete_subscription_does_not_burn_starter_grant_until_it_turns_active(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['stripe_id' => 'cus_incomplete'])->save();
        $credits = app(AiCreditService::class);

        $this->dispatchSubscriptionWebhook('customer.subscription.created', ['customer' => 'cus_incomplete', 'status' => 'incomplete']);

        $this->assertSame(0, $credits->balance($user));
        $this->assertNull($user->fresh()->ai_starter_credits_granted_at);

        $this->dispatchSubscriptionWebhook('customer.subscription.updated', ['customer' => 'cus_incomplete', 'status' => 'active']);
        // Stripe redelivers events; a duplicate must not double-grant.
        $this->dispatchSubscriptionWebhook('customer.subscription.updated', ['customer' => 'cus_incomplete', 'status' => 'active']);

        $this->assertSame(config('ai.starter_credits'), $credits->balance($user));
        $this->assertNotNull($user->fresh()->ai_starter_credits_granted_at);
    }

    public function test_trialing_subscription_created_grants_starter_credits(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['stripe_id' => 'cus_trial'])->save();

        $this->dispatchSubscriptionWebhook('customer.subscription.created', ['customer' => 'cus_trial', 'status' => 'trialing']);

        $this->assertSame(config('ai.starter_credits'), app(AiCreditService::class)->balance($user));
    }
}
