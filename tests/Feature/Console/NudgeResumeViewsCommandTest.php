<?php

namespace Tests\Feature\Console;

use App\Mail\ResumeViewNudgeMail;
use App\Models\Resume;
use App\Models\ResumeSectionEvent;
use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class NudgeResumeViewsCommandTest extends TestCase
{
    use RefreshDatabase;

    private function logView(Resume $resume): void
    {
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        ResumeShareEvent::create([
            'resume_share_link_id' => $link->id,
            'resume_id' => $resume->id,
            'event' => 'page_view',
        ]);
    }

    public function test_sends_mail_for_free_user_with_new_views(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $this->logView($resume);

        $this->artisan('resumes:nudge-views')->assertSuccessful();

        Mail::assertQueued(ResumeViewNudgeMail::class, fn ($m) => $m->hasTo($user->email));
        $this->assertNotNull($user->refresh()->view_nudge_sent_at);
    }

    public function test_skips_free_user_with_no_views(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        Resume::factory()->create(['user_id' => $user->id]);

        $this->artisan('resumes:nudge-views')->assertSuccessful();

        Mail::assertNothingQueued();
    }

    public function test_respects_cooldown(): void
    {
        Mail::fake();
        $user = User::factory()->create(['view_nudge_sent_at' => now()]);
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $this->logView($resume);

        $this->artisan('resumes:nudge-views')->assertSuccessful();

        Mail::assertNothingQueued();
    }

    public function test_includes_top_section_by_dwell_time(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $this->logView($resume);

        ResumeSectionEvent::create(['resume_id' => $resume->id, 'section' => 'summary', 'dwell_ms' => 1000, 'ip_hash' => 'a']);
        ResumeSectionEvent::create(['resume_id' => $resume->id, 'section' => 'experience', 'dwell_ms' => 5000, 'ip_hash' => 'b']);

        $this->artisan('resumes:nudge-views')->assertSuccessful();

        Mail::assertQueued(ResumeViewNudgeMail::class, fn ($m) => $m->topSection === 'experience');
    }
}
