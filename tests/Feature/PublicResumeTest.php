<?php

namespace Tests\Feature;

use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class PublicResumeTest extends TestCase
{
    use RefreshDatabase;

    private function makeLink(bool $active = true): ResumeShareLink
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'My CV', 'pdf_filename' => 'cv.pdf']);

        return $resume->shareLinks()->create(['is_active' => $active]);
    }

    public function test_active_link_returns_200(): void
    {
        $link = $this->makeLink(true);
        $this->get(route('public.resume', $link->token))->assertOk();
    }

    public function test_inactive_link_returns_410(): void
    {
        $link = $this->makeLink(false);
        $this->get(route('public.resume', $link->token))->assertStatus(410);
    }

    public function test_thread_stored_via_public_route(): void
    {
        $link = $this->makeLink(true);
        $this->post(route('public.thread.store', $link->token), [
            'sender_name' => 'Bob',
            'sender_email' => 'bob@example.com',
            'message' => 'Are you available to start next week?',
        ])->assertRedirect();

        $this->assertDatabaseHas('resume_threads', [
            'sender_name' => 'Bob',
            'resume_id' => $link->resume_id,
        ]);
    }

    public function test_thread_requires_name_email_and_message(): void
    {
        $link = $this->makeLink(true);
        $this->post(route('public.thread.store', $link->token), [])->assertSessionHasErrors([
            'sender_name', 'sender_email', 'message',
        ]);
    }

    public function test_expired_link_returns_410(): void
    {
        $link = $this->makeLink(true);
        $link->update(['expires_at' => now()->subDay()]);

        $this->get(route('public.resume', $link->token))->assertStatus(410);
    }

    public function test_non_expired_link_returns_200(): void
    {
        $link = $this->makeLink(true);
        $link->update(['expires_at' => now()->addDay()]);

        $this->get(route('public.resume', $link->token))->assertOk();
    }

    public function test_link_with_no_expiry_returns_200(): void
    {
        $link = $this->makeLink(true);
        $this->assertNull($link->expires_at);

        $this->get(route('public.resume', $link->token))->assertOk();
    }

    public function test_expired_link_rejects_thread_submission(): void
    {
        $link = $this->makeLink(true);
        $link->update(['expires_at' => now()->subDay()]);

        $this->post(route('public.thread.store', $link->token), [
            'sender_name' => 'Alice',
            'sender_email' => 'alice@example.com',
            'message' => 'Hi',
        ])->assertStatus(410);
    }

    public function test_public_thread_form_is_rate_limited(): void
    {
        RateLimiter::clear('public-thread');

        $link = $this->makeLink(true);
        $payload = [
            'sender_name' => 'Spammer',
            'sender_email' => 'spam@example.com',
            'message' => 'Buy my stuff',
        ];

        for ($i = 0; $i < 5; $i++) {
            $this->post(route('public.thread.store', $link->token), $payload);
        }

        $response = $this->post(route('public.thread.store', $link->token), $payload);
        $response->assertStatus(429);
    }
}
