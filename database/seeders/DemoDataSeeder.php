<?php

namespace Database\Seeders;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Local demo data so the admin Revenue / Growth dashboards look populated.
 * Idempotent: wipes prior demo rows (email @demo.resumegen.test) and reseeds.
 * NOT for production — sandbox/dev only.
 */
class DemoDataSeeder extends Seeder
{
    private const DOMAIN = '@demo.resumegen.test';

    /** Sandbox price IDs created in the Resumegen Stripe sandbox. */
    private const PRICES = [
        'starter' => 'price_1TidM6CXfLCcPZ9hJwnPuNlZ', // Starter Monthly
        'pro' => 'price_1TidM9CXfLCcPZ9hvdXUoyEz',     // Pro Monthly
        'agency' => 'price_1TidMBCXfLCcPZ9hZ3MNbTMh',  // Agency Monthly
    ];

    public function run(): void
    {
        $this->wipe();

        // Paying users per tier, spread across the last 60 days for the time series.
        $this->seedPaying('starter', 12);
        $this->seedPaying('pro', 8);
        $this->seedPaying('agency', 3);

        // Free users: 8 activated (have a resume), 7 not — drives the funnel.
        $this->seedFree(activated: 8, dormant: 7);

        $this->command?->info('Demo data seeded: 23 paying + 15 free users.');
    }

    private function seedPaying(string $tier, int $count): void
    {
        for ($i = 0; $i < $count; $i++) {
            $createdAt = now()->subDays(rand(1, 60))->subHours(rand(0, 23));

            $user = User::factory()->create([
                'email' => "{$tier}{$i}".self::DOMAIN,
                'plan_tier' => $tier,
                'is_agency' => $tier === 'agency',
                'stripe_id' => 'cus_demo_'.$tier.$i,
                'has_completed_onboarding' => true,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

            Resume::factory()->create(['user_id' => $user->id, 'created_at' => $createdAt]);

            // Subscription created 0-2 days after signup → realistic days-to-convert.
            $subAt = $createdAt->copy()->addDays(rand(0, 2));
            DB::table('subscriptions')->insert([
                'user_id' => $user->id,
                'type' => 'default',
                'stripe_id' => 'sub_demo_'.$tier.$i,
                'stripe_status' => 'active',
                'stripe_price' => self::PRICES[$tier],
                'quantity' => 1,
                'created_at' => $subAt,
                'updated_at' => $subAt,
            ]);

            $this->stampActivity($user->id, $createdAt);
        }
    }

    private function seedFree(int $activated, int $dormant): void
    {
        for ($i = 0; $i < $activated + $dormant; $i++) {
            $createdAt = now()->subDays(rand(1, 60));
            $user = User::factory()->free()->create([
                'email' => "free{$i}".self::DOMAIN,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

            if ($i < $activated) {
                Resume::factory()->create(['user_id' => $user->id, 'created_at' => $createdAt]);
            }

            $this->stampActivity($user->id, $createdAt);
        }
    }

    /** A few active days from signup onward for retention cohorts. */
    private function stampActivity(int $userId, Carbon $from): void
    {
        $rows = [];
        for ($w = 0; $w < rand(1, 5); $w++) {
            $rows[] = [
                'user_id' => $userId,
                'activity_date' => $from->copy()->addWeeks($w)->toDateString(),
            ];
        }
        DB::table('user_activity_days')->insertOrIgnore($rows);
    }

    private function wipe(): void
    {
        $ids = User::where('email', 'like', '%'.self::DOMAIN)->pluck('id');
        if ($ids->isEmpty()) {
            return;
        }
        DB::table('subscriptions')->whereIn('user_id', $ids)->delete();
        DB::table('user_activity_days')->whereIn('user_id', $ids)->delete();
        User::whereIn('id', $ids)->each(fn (User $u) => $u->delete()); // cascades resumes via observer
    }
}
