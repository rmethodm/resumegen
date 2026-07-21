<?php

namespace Tests\Feature\Mail;

use App\Mail\NewPortfolioMessageMail;
use App\Mail\NewThreadStarted;
use App\Mail\NewVisitorReply;
use App\Mail\ResumeViewNudgeMail;
use App\Mail\StaleResumeNudgeMail;
use App\Mail\TwoFactorCodeMail;
use App\Mail\VisitorThreadReply;
use App\Models\PortfolioMessage;
use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\ResumeThread;
use App\Models\ResumeThreadMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Every other mail test in this suite calls Mail::fake(), which asserts a mailable
 * was queued but never renders its body. A dead route() or an undefined view
 * variable therefore stays invisible until the queued job throws in production —
 * which is exactly how route('billing.index') survived the billing removal inside
 * resume-view-nudge.blade.php.
 *
 * These tests render each mailable for real. They assert almost nothing about the
 * content on purpose: the render itself is the assertion, and it fails on a dead
 * route, a missing view, or an unpassed variable.
 */
class MailRendersTest extends TestCase
{
    use RefreshDatabase;

    private function thread(Resume $resume, ResumeShareLink $link): ResumeThread
    {
        return ResumeThread::create([
            'resume_id' => $resume->id,
            'share_link_id' => $link->id,
            'sender_name' => 'Dana Recruiter',
            'sender_email' => 'dana@example.com',
        ]);
    }

    private function message(ResumeThread $thread, bool $isOwner): ResumeThreadMessage
    {
        return ResumeThreadMessage::create([
            'thread_id' => $thread->id,
            'body' => 'Thanks for sharing this.',
            'is_owner' => $isOwner,
        ]);
    }

    public function test_resume_view_nudge_renders(): void
    {
        $user = User::factory()->create();

        $body = (new ResumeViewNudgeMail($user, 3, 'experience'))->render();

        $this->assertStringContainsString(route('dashboard'), $body);
        // Regression guard: this mail pitched "Upgrade to Starter" and a watermark
        // that billing removal deleted on 2026-07-14. The product is free and
        // unlimited; no mail may sell a plan.
        $this->assertStringNotContainsString('Upgrade', $body);
    }

    public function test_stale_resume_nudge_renders(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $body = (new StaleResumeNudgeMail($user, $resume, 30))->render();

        $this->assertStringContainsString(route('builder.edit', $resume->id), $body);
    }

    public function test_two_factor_code_renders(): void
    {
        $this->assertStringContainsString('123456', (new TwoFactorCodeMail('123456'))->render());
    }

    public function test_new_portfolio_message_renders(): void
    {
        $user = User::factory()->create();
        $message = PortfolioMessage::factory()->create(['user_id' => $user->id]);

        $body = (new NewPortfolioMessageMail($user, $message))->render();

        $this->assertStringContainsString(route('portfolio.edit'), $body);
    }

    public function test_new_thread_started_renders(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);
        $thread = $this->thread($resume, $link);

        $body = (new NewThreadStarted($thread, $this->message($thread, false), $resume))->render();

        $this->assertStringContainsString(route('builder.thread', [$resume->id, $thread->id]), $body);
    }

    public function test_new_visitor_reply_renders(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);
        $thread = $this->thread($resume, $link);

        $body = (new NewVisitorReply($thread, $this->message($thread, false), $resume))->render();

        $this->assertStringContainsString(route('builder.thread', [$resume->id, $thread->id]), $body);
    }

    public function test_visitor_thread_reply_renders(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);
        $thread = $this->thread($resume, $link);

        $body = (new VisitorThreadReply($thread, $this->message($thread, true), $resume, $link))->render();

        $this->assertStringContainsString(route('public.resume', $link->token), $body);
    }
}
