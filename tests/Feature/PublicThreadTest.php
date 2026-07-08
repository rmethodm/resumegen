<?php

namespace Tests\Feature;

use App\Mail\NewThreadStarted;
use App\Mail\NewVisitorReply;
use App\Models\ResumeShareLink;
use App\Models\ResumeThread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PublicThreadTest extends TestCase
{
    use RefreshDatabase;

    private function makeLink(bool $active = true): ResumeShareLink
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'My CV', 'pdf_filename' => 'cv.pdf']);

        return $resume->shareLinks()->create(['is_active' => $active]);
    }

    public function test_visitor_can_start_a_thread(): void
    {
        Mail::fake();
        $link = $this->makeLink();

        $this->post(route('public.thread.store', $link->token), [
            'sender_name' => 'Alice',
            'sender_email' => 'alice@example.com',
            'message' => 'Are you available?',
        ])->assertRedirect();

        $this->assertDatabaseHas('resume_threads', [
            'sender_name' => 'Alice',
            'sender_email' => 'alice@example.com',
            'resume_id' => $link->resume_id,
        ]);

        $thread = ResumeThread::first();
        $this->assertDatabaseHas('resume_thread_messages', [
            'thread_id' => $thread->id,
            'body' => 'Are you available?',
            'is_owner' => false,
        ]);
    }

    public function test_new_thread_queues_mail_to_owner(): void
    {
        Mail::fake();
        $link = $this->makeLink();

        $this->post(route('public.thread.store', $link->token), [
            'sender_name' => 'Bob',
            'sender_email' => 'bob@example.com',
            'message' => 'Hello!',
        ]);

        Mail::assertQueued(NewThreadStarted::class, fn ($m) => $m->hasTo($link->resume->user->email));
    }

    public function test_thread_store_requires_name_email_message(): void
    {
        $link = $this->makeLink();

        $this->post(route('public.thread.store', $link->token), [])
            ->assertSessionHasErrors(['sender_name', 'sender_email', 'message']);
    }

    public function test_inactive_link_rejects_thread_creation(): void
    {
        $link = $this->makeLink(false);

        $this->post(route('public.thread.store', $link->token), [
            'sender_name' => 'X',
            'sender_email' => 'x@x.com',
            'message' => 'Hi',
        ])->assertStatus(410);
    }

    public function test_expired_link_rejects_thread_creation(): void
    {
        $link = $this->makeLink(true);
        $link->update(['expires_at' => now()->subDay()]);

        $this->post(route('public.thread.store', $link->token), [
            'sender_name' => 'X',
            'sender_email' => 'x@x.com',
            'message' => 'Hi',
        ])->assertStatus(410);
    }

    public function test_visitor_can_add_follow_up_message_with_valid_session(): void
    {
        Mail::fake();
        $link = $this->makeLink();

        $this->post(route('public.thread.store', $link->token), [
            'sender_name' => 'Alice',
            'sender_email' => 'alice@example.com',
            'message' => 'First message',
        ]);

        $thread = ResumeThread::first();

        $this->withSession(['owned_threads' => [$thread->id]])
            ->post(route('public.thread.message', [$link->token, $thread->id]), [
                'message' => 'Follow-up message',
            ])->assertRedirect();

        $this->assertDatabaseCount('resume_thread_messages', 2);
    }

    public function test_visitor_cannot_add_message_without_session_ownership(): void
    {
        $link = $this->makeLink();
        $thread = ResumeThread::create([
            'resume_id' => $link->resume_id,
            'sender_name' => 'Alice',
            'sender_email' => 'alice@example.com',
        ]);

        $this->post(route('public.thread.message', [$link->token, $thread->id]), [
            'message' => 'Unauthorized reply',
        ])->assertStatus(403);
    }

    public function test_visitor_follow_up_queues_mail_to_owner(): void
    {
        Mail::fake();
        $link = $this->makeLink();

        $thread = ResumeThread::create([
            'resume_id' => $link->resume_id,
            'sender_name' => 'Alice',
            'sender_email' => 'alice@example.com',
        ]);

        $this->withSession(['owned_threads' => [$thread->id]])
            ->post(route('public.thread.message', [$link->token, $thread->id]), [
                'message' => 'Follow-up',
            ]);

        Mail::assertQueued(NewVisitorReply::class, fn ($m) => $m->hasTo($link->resume->user->email));
    }
}
