<?php

namespace Database\Seeders;

use App\Models\JobPairing;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Twelve months of invented traffic, so `pricing:growth` has something to report
 * before the real thing has any users.
 *
 * This is a MODEL, not data. Every number below is an assumption, listed in one
 * place so it can be argued with. It writes at the *proposed* prices from
 * docs/prepaid-pricing-model.md, not config/pricing.php — those are still 0, and a
 * profitability report against a price of zero says nothing.
 *
 * Idempotent: wipes and rewrites only the accounts it owns (@growth.sample).
 *
 * ponytail: raw DB inserts, no factories. 45k rows through Eloquent for a report
 * fixture is a minute of waiting for nothing.
 */
class GrowthSampleSeeder extends Seeder
{
    /** Marks every account this seeder owns, so a re-run can clear its own mess. */
    private const EMAIL_DOMAIN = 'growth.sample';

    /** Proposed price of one job, in cents (pricing doc §2). */
    private const JOB_CENTS = 50;

    /** Proposed one-time signup grant, in cents (§8). Covers __general__ + 9 jobs. */
    private const GRANT_CENTS = 500;

    /** Proposed minimum top-up, in cents (§4). Users buy in $5 blocks. */
    private const TOPUP_CENTS = 500;

    /**
     * The scenario levers, overridable per run so sweeps need no edit to this file:
     *
     *   GROWTH_JOB_CENTS=75 GROWTH_GRANT_CENTS=100 php artisan db:seed --class=GrowthSampleSeeder
     *
     * Prices in cents; GROWTH_ACTIVATION_PCT and GROWTH_JOBS_SCALE_PCT are percentages;
     * GROWTH_RAMP_PCT is the month-over-month signup multiplier as a percentage (125 =
     * 1.25x) and, when set, replaces SIGNUPS_PER_MONTH entirely; GROWTH_GENERAL_FREE=1
     * makes the reserved __general__ pairing cost nothing.
     *
     * ponytail: env vars, not a scenario config object. A handful of numbers for a
     * report fixture do not need a schema.
     */
    private int $jobCents;

    private int $grantCents;

    private int $topupCents;

    private float $activationRate;

    private float $jobsScale;

    private bool $generalFree;

    /** @var list<int> */
    private array $signupsPerMonth;

    /**
     * New signups per month, month 1 (11 months ago) through month 12 (this month).
     * A ~1.25x month-over-month ramp off a small base — organic growth with no
     * paid acquisition, which is the only scenario the app is currently set up for.
     */
    private const SIGNUPS_PER_MONTH = [20, 26, 34, 44, 57, 74, 95, 122, 157, 200, 255, 325];

    /** Share of signups who ever tailor a job. The rest look around and leave. */
    private const ACTIVATION_RATE = 0.55;

    /**
     * Lifetime jobs tailored per activated user, as cumulative percentile bands.
     * Shaped to put the median around 4 and p90 around 12 — a job seeker runs a
     * burst of applications and stops, they do not tailor jobs forever.
     *
     * @var list<array{0: int, 1: int, 2: int}> [cumulative percent, min jobs, max jobs]
     */
    private const JOBS_DISTRIBUTION = [
        [35, 1, 2],    // tried it, applied to one or two things
        [65, 3, 5],
        [85, 6, 9],    // still inside the grant
        [96, 10, 16],  // first paying users
        [100, 17, 30], // heavy searchers
    ];

    /** AI calls per job. Rewrite a few bullets, a summary, ATS keywords, a cover letter. */
    private const AI_CALLS_PER_JOB = [3, 9];

    /** Token envelope of one call: resume context in, a paragraph or two out. */
    private const PROMPT_TOKENS = [900, 2200];

    private const COMPLETION_TOKENS = [150, 600];

    private const MODEL = 'gpt-4o-mini';

    /** @var list<string> */
    private const FEATURES = [
        'rewrite_bullet', 'critique_bullet', 'generate_summary',
        'ats_keywords', 'cover_letter', 'rank_jobs',
    ];

    /** @var list<string> */
    private const COMPANIES = [
        'Northgate Systems', 'Loomis Software', 'Cascade Health', 'Fernwood Labs',
        'Harborline', 'Tandem Analytics', 'Bayou General', 'Ridgeway Foods',
        'Delta Optics', 'Kestrel Robotics', 'Ambler Retail', 'Pinehurst Bank',
    ];

    /** @var list<string> */
    private const TITLES = [
        'Backend Engineer', 'Data Analyst', 'Marketing Manager', 'Registered Nurse',
        'Product Manager', 'Staff Engineer', 'Operations Lead', 'Solutions Architect',
    ];

    /** @var list<array<string, mixed>> */
    private array $aiBuffer = [];

    public function run(): void
    {
        // Deterministic: two runs produce the same report, so a change in the numbers
        // means a change in the assumptions and not a reshuffled dice roll.
        mt_srand(20260720);

        $this->jobCents = (int) env('GROWTH_JOB_CENTS', self::JOB_CENTS);
        $this->grantCents = (int) env('GROWTH_GRANT_CENTS', self::GRANT_CENTS);
        $this->topupCents = (int) env('GROWTH_TOPUP_CENTS', self::TOPUP_CENTS);
        $this->activationRate = ((int) env('GROWTH_ACTIVATION_PCT', 55)) / 100;
        $this->jobsScale = ((int) env('GROWTH_JOBS_SCALE_PCT', 100)) / 100;
        $this->generalFree = (bool) env('GROWTH_GENERAL_FREE', false);
        $this->signupsPerMonth = $this->resolveSignupRamp();

        $this->command?->info(sprintf(
            'Scenario: %dc per job, $%.2f grant, $%.2f minimum top-up, %.0f%% activation, '
                .'%.2fx jobs, __general__ %s, %s signups over 12 months.',
            $this->jobCents,
            $this->grantCents / 100,
            $this->topupCents / 100,
            $this->activationRate * 100,
            $this->jobsScale,
            $this->generalFree ? 'free' : 'charged',
            number_format(array_sum($this->signupsPerMonth)),
        ));

        $this->clearPreviousRun();

        $password = Hash::make('password');
        $month1 = Carbon::now()->startOfMonth()->subMonths(11);
        $created = 0;

        DB::transaction(function () use ($password, $month1, &$created): void {
            foreach ($this->signupsPerMonth as $monthIndex => $signups) {
                $monthStart = $month1->copy()->addMonths($monthIndex);

                for ($i = 0; $i < $signups; $i++) {
                    $signedUpAt = $this->momentWithin($monthStart);
                    $userId = $this->createUser($signedUpAt, $password, $created++);

                    if ($this->chance($this->activationRate)) {
                        $this->simulateActivity($userId, $signedUpAt);
                    }
                }
            }

            $this->flushAiRequests();
        });

        $this->command?->info("Seeded {$created} sample accounts across 12 months. Run `php artisan pricing:growth`.");
    }

    /**
     * The published ramp unless GROWTH_RAMP_PCT overrides it. Kept as a literal list by
     * default rather than generated from a multiplier, so the baseline stays byte-identical
     * to every earlier run of this model — a sweep should change one thing at a time.
     *
     * @return list<int>
     */
    private function resolveSignupRamp(): array
    {
        $rampPercent = (int) env('GROWTH_RAMP_PCT', 0);

        if ($rampPercent <= 0) {
            return self::SIGNUPS_PER_MONTH;
        }

        $ramp = $rampPercent / 100;
        $base = self::SIGNUPS_PER_MONTH[0];

        return array_map(
            fn (int $month): int => max(1, (int) round($base * $ramp ** $month)),
            range(0, count(self::SIGNUPS_PER_MONTH) - 1),
        );
    }

    private function clearPreviousRun(): void
    {
        $sampleUserIds = DB::table('users')
            ->where('email', 'like', '%@'.self::EMAIL_DOMAIN)
            ->pluck('id');

        // ai_requests.user_id is nullOnDelete, not cascadeOnDelete — a real user's cost
        // history deliberately outlives the account. Correct for production, wrong for a
        // fixture: deleting the users first would strand these rows with a NULL user_id
        // and they would still be summed into every later report's AI cost, inflating it
        // by one whole run each re-seed. Delete them while the join still resolves.
        DB::table('ai_requests')->whereIn('user_id', $sampleUserIds)->delete();

        // The rest (resumes, pairings, the ledger) do cascade.
        DB::table('users')->whereIn('id', $sampleUserIds)->delete();
    }

    private function createUser(Carbon $signedUpAt, string $password, int $index): int
    {
        $id = DB::table('users')->insertGetId([
            'name' => 'Sample User '.($index + 1),
            'email' => 'growth'.($index + 1).'@'.self::EMAIL_DOMAIN,
            'password' => $password,
            'email_verified_at' => $signedUpAt,
            'created_at' => $signedUpAt,
            'updated_at' => $signedUpAt,
        ]);

        $this->ledger($id, $this->grantCents, 'signup_grant', null, $signedUpAt);

        return $id;
    }

    /**
     * One activated user's whole life: a resume, the reserved __general__ pairing,
     * then their jobs spread forward from signup with the burst front-loaded.
     */
    private function simulateActivity(int $userId, Carbon $signedUpAt): void
    {
        DB::table('resumes')->insert([
            'user_id' => $userId,
            'name' => 'My Resume',
            'template' => 'classic',
            'created_at' => $signedUpAt,
            'updated_at' => $signedUpAt,
        ]);

        $this->purchase(
            $userId,
            JobPairing::GENERAL,
            null,
            null,
            $signedUpAt,
            aiCalls: mt_rand(2, 6),
            priceCents: $this->generalFree ? 0 : $this->jobCents,
        );

        $jobs = $this->drawJobCount();
        // Applications cluster: roughly half in the first month, tapering after.
        $spreadDays = min(180, 20 * (int) ceil($jobs / 3));

        for ($j = 0; $j < $jobs; $j++) {
            $company = self::COMPANIES[mt_rand(0, count(self::COMPANIES) - 1)];
            $title = self::TITLES[mt_rand(0, count(self::TITLES) - 1)];
            $at = $signedUpAt->copy()->addDays((int) round($spreadDays * ($j / max($jobs, 1)) ** 1.6))
                ->addHours(mt_rand(0, 23));

            // A job tailored in the future has not happened yet.
            if ($at->isFuture()) {
                return;
            }

            $this->purchase(
                $userId,
                JobPairing::billingKey($company, $title).'-'.$j, // -$j keeps every draw a distinct job
                $company,
                $title,
                $at,
                aiCalls: mt_rand(self::AI_CALLS_PER_JOB[0], self::AI_CALLS_PER_JOB[1]),
            );
        }
    }

    /**
     * Buy one pairing: top up first if the balance will not cover it, then charge.
     * This is what makes revenue emerge from usage rather than being asserted.
     */
    private function purchase(int $userId, string $key, ?string $company, ?string $title, Carbon $at, int $aiCalls, ?int $priceCents = null): void
    {
        $price = $priceCents ?? $this->jobCents;
        $balance = (int) DB::table('balance_transactions')->where('user_id', $userId)->sum('amount_cents');

        // A free pairing never triggers a top-up, however empty the balance is.
        if ($price > 0 && $balance < $price) {
            $this->ledger($userId, $this->topupCents, 'topup', null, $at);
        }

        $pairingId = DB::table('job_pairings')->insertGetId([
            'user_id' => $userId,
            'billing_key' => $key,
            'company' => $company,
            'title' => $title,
            'price_cents' => $price,
            'created_at' => $at,
            'updated_at' => $at,
        ]);

        if ($price > 0) {
            $this->ledger($userId, -$price, 'charge', $pairingId, $at);
        }

        for ($i = 0; $i < $aiCalls; $i++) {
            $this->aiRequest($userId, $pairingId, $at->copy()->addMinutes($i * mt_rand(2, 40)));
        }
    }

    private function ledger(int $userId, int $amountCents, string $reason, ?int $pairingId, Carbon $at): void
    {
        DB::table('balance_transactions')->insert([
            'user_id' => $userId,
            'amount_cents' => $amountCents,
            'reason' => $reason,
            'job_pairing_id' => $pairingId,
            'created_at' => $at,
        ]);
    }

    private function aiRequest(int $userId, int $pairingId, Carbon $at): void
    {
        $prompt = mt_rand(self::PROMPT_TOKENS[0], self::PROMPT_TOKENS[1]);
        $completion = mt_rand(self::COMPLETION_TOKENS[0], self::COMPLETION_TOKENS[1]);

        $this->aiBuffer[] = [
            'user_id' => $userId,
            'job_pairing_id' => $pairingId,
            'feature' => self::FEATURES[mt_rand(0, count(self::FEATURES) - 1)],
            'model' => self::MODEL,
            'prompt_tokens' => $prompt,
            'completion_tokens' => $completion,
            'total_tokens' => $prompt + $completion,
            'estimated_cost_micro_cents' => $this->costMicroCents($prompt, $completion),
            // ~2% of calls fail or get moderated. They still cost tokens on the way in.
            'status' => $this->chance(0.98) ? 'success' : 'error',
            'created_at' => $at,
        ];

        if (count($this->aiBuffer) >= 1000) {
            $this->flushAiRequests();
        }
    }

    /** Priced off config('ai.pricing') so the modelled cost tracks the real rate card. */
    private function costMicroCents(int $promptTokens, int $completionTokens): int
    {
        $rates = config('ai.pricing.'.self::MODEL, ['input' => 0, 'output' => 0]);

        $cents = $promptTokens / 1000 * $rates['input'] + $completionTokens / 1000 * $rates['output'];

        return (int) round($cents * 1_000_000);
    }

    private function flushAiRequests(): void
    {
        if ($this->aiBuffer !== []) {
            DB::table('ai_requests')->insert($this->aiBuffer);
            $this->aiBuffer = [];
        }
    }

    private function drawJobCount(): int
    {
        $roll = mt_rand(1, 100);

        foreach (self::JOBS_DISTRIBUTION as [$cumulative, $min, $max]) {
            if ($roll <= $cumulative) {
                // Scaled after the draw, not by reshaping the bands, so the distribution
                // keeps its shape and only its magnitude moves. An activated user always
                // tailors at least one job — that is what activated means.
                return max(1, (int) round(mt_rand($min, $max) * $this->jobsScale));
            }
        }

        return 1;
    }

    private function chance(float $probability): bool
    {
        return mt_rand(1, 10000) <= $probability * 10000;
    }

    private function momentWithin(Carbon $monthStart): Carbon
    {
        return $monthStart->copy()
            ->addDays(mt_rand(0, $monthStart->daysInMonth - 1))
            ->addHours(mt_rand(8, 22))
            ->addMinutes(mt_rand(0, 59));
    }
}
