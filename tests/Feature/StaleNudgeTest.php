<?php

namespace Tests\Feature;

use App\Console\Commands\NudgeStaleResumesCommand;
use App\Mail\StaleResumeNudgeMail;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class StaleNudgeTest extends TestCase
{
    use RefreshDatabase;

    public function test_sends_mail_for_user_with_stale_resume(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        Resume::factory()->create([
            'user_id' => $user->id,
            'updated_at' => now()->subDays(31),
            'is_snapshot' => false,
        ]);

        $this->artisan('resumes:nudge-stale')->assertSuccessful();

        Mail::assertQueued(StaleResumeNudgeMail::class, fn ($m) => $m->hasTo($user->email));
    }

    public function test_skips_user_nudged_within_7_days(): void
    {
        Mail::fake();
        $user = User::factory()->create(['stale_nudge_sent_at' => now()->subDays(3)]);
        Resume::factory()->create([
            'user_id' => $user->id,
            'updated_at' => now()->subDays(31),
            'is_snapshot' => false,
        ]);

        $this->artisan('resumes:nudge-stale')->assertSuccessful();

        Mail::assertNothingQueued();
    }

    public function test_skips_user_with_no_stale_resumes(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        Resume::factory()->create([
            'user_id' => $user->id,
            'updated_at' => now()->subDays(10),
            'is_snapshot' => false,
        ]);

        $this->artisan('resumes:nudge-stale')->assertSuccessful();

        Mail::assertNothingQueued();
    }

    public function test_skips_snapshots(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        Resume::factory()->create([
            'user_id' => $user->id,
            'updated_at' => now()->subDays(31),
            'is_snapshot' => true,
        ]);

        $this->artisan('resumes:nudge-stale')->assertSuccessful();

        Mail::assertNothingQueued();
    }

    public function test_sends_one_mail_per_user_with_multiple_stale_resumes(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        Resume::factory()->count(3)->create([
            'user_id' => $user->id,
            'updated_at' => now()->subDays(31),
            'is_snapshot' => false,
        ]);

        $this->artisan('resumes:nudge-stale')->assertSuccessful();

        Mail::assertQueued(StaleResumeNudgeMail::class, 1);
    }
}
