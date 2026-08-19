<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Console\Scheduling\CallbackEvent;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ResumeDeletionPruneTest extends TestCase
{
    use RefreshDatabase;

    /**
     * resume_deletions only serves mobile `?since=` pulls, so rows older than
     * any plausible offline window are dead weight — the scheduled prune must
     * drop them without touching rows a client could still need.
     */
    public function test_scheduled_prune_drops_only_stale_deletion_rows(): void
    {
        $user = User::factory()->create();

        DB::table('resume_deletions')->insert([
            ['user_id' => $user->id, 'resume_id' => 1, 'deleted_at' => now()->subDays(91)],
            ['user_id' => $user->id, 'resume_id' => 2, 'deleted_at' => now()->subDays(89)],
        ]);

        $event = collect(app(Schedule::class)->events())
            ->first(fn ($event) => $event instanceof CallbackEvent && $event->description === 'prune-resume-deletions');

        $this->assertNotNull($event, 'prune-resume-deletions is not scheduled');

        $event->run($this->app);

        $this->assertSame(
            [2],
            DB::table('resume_deletions')->pluck('resume_id')->all(),
        );
    }
}
