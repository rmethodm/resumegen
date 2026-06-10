<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PruneStrengthSnapshotsTest extends TestCase
{
    use RefreshDatabase;

    public function test_prunes_old_snapshots_keeping_60_most_recent_when_over_minimum(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        // Create 70 snapshots all older than 90 days
        foreach (range(1, 70) as $i) {
            DB::table('resume_strength_snapshots')->insert([
                'resume_id' => $resume->id,
                'score' => $i,
                'checklist' => json_encode([]),
                'created_at' => now()->subDays(91 + $i)->toDateTimeString(),
            ]);
        }

        $this->assertDatabaseCount('resume_strength_snapshots', 70);

        $this->artisan('strength-snapshots:prune')->assertSuccessful();

        $this->assertDatabaseCount('resume_strength_snapshots', 60);
    }

    public function test_retains_all_snapshots_when_below_minimum_retention(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        // Create 50 snapshots all older than 90 days
        foreach (range(1, 50) as $i) {
            DB::table('resume_strength_snapshots')->insert([
                'resume_id' => $resume->id,
                'score' => $i,
                'checklist' => json_encode([]),
                'created_at' => now()->subDays(91 + $i)->toDateTimeString(),
            ]);
        }

        $this->assertDatabaseCount('resume_strength_snapshots', 50);

        $this->artisan('strength-snapshots:prune')->assertSuccessful();

        $this->assertDatabaseCount('resume_strength_snapshots', 50);
    }
}
