<?php

namespace Database\Seeders;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Local demo data so the admin Growth dashboard looks populated.
 * Idempotent: wipes prior demo rows (email @demo.resumegen.test) and reseeds.
 * NOT for production — sandbox/dev only.
 */
class DemoDataSeeder extends Seeder
{
    private const DOMAIN = '@demo.resumegen.test';

    public function run(): void
    {
        $this->wipe();

        // 23 activated (have a resume), 15 dormant — drives the activation funnel.
        $this->seedUsers(activated: 23, dormant: 15);

        $this->command?->info('Demo data seeded: 38 users (23 activated, 15 dormant).');
    }

    private function seedUsers(int $activated, int $dormant): void
    {
        for ($i = 0; $i < $activated + $dormant; $i++) {
            $createdAt = now()->subDays(rand(1, 60))->subHours(rand(0, 23));

            $user = User::factory()->create([
                'email' => "demo{$i}".self::DOMAIN,
                'has_completed_onboarding' => $i < $activated,
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
                'activity_date' => $from->addWeeks($w)->toDateString(),
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
        DB::table('user_activity_days')->whereIn('user_id', $ids)->delete();
        User::whereIn('id', $ids)->each(fn (User $u) => $u->delete()); // cascades resumes via observer
    }
}
