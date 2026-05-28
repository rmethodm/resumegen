<?php
namespace Tests\Feature;

use App\Models\Resume;
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

    public function test_question_stored_via_public_route(): void
    {
        $link = $this->makeLink(true);
        $this->post(route('public.question', $link->token), [
            'sender_name'  => 'Bob',
            'sender_email' => 'bob@example.com',
            'sender_phone' => '555-9999',
            'message'      => 'Are you available to start next week?',
        ])->assertRedirect();

        $this->assertDatabaseHas('resume_questions', [
            'sender_name' => 'Bob',
            'resume_id'   => $link->resume_id,
        ]);
    }

    public function test_question_requires_name_email_and_message_but_not_phone(): void
    {
        $link = $this->makeLink(true);
        $this->post(route('public.question', $link->token), [])->assertSessionHasErrors([
            'sender_name', 'sender_email', 'message',
        ])->assertSessionDoesntHaveErrors('sender_phone');
    }

    public function test_question_can_be_submitted_without_phone(): void
    {
        $link = $this->makeLink(true);
        $this->post(route('public.question', $link->token), [
            'sender_name'  => 'Alice',
            'sender_email' => 'alice@example.com',
            'message'      => 'Hello, I am interested.',
        ])->assertRedirect();

        $this->assertDatabaseHas('resume_questions', [
            'sender_name'  => 'Alice',
            'sender_phone' => null,
            'resume_id'    => $link->resume_id,
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

    public function test_expired_link_rejects_question_submission(): void
    {
        $link = $this->makeLink(true);
        $link->update(['expires_at' => now()->subDay()]);

        $this->post(route('public.question', $link->token), [
            'sender_name'  => 'Alice',
            'sender_email' => 'alice@example.com',
            'message'      => 'Hi',
        ])->assertStatus(410);
    }

    public function test_public_question_form_is_rate_limited(): void
    {
        RateLimiter::clear('public-question');

        $link = $this->makeLink(true);
        $payload = [
            'sender_name'  => 'Spammer',
            'sender_email' => 'spam@example.com',
            'message'      => 'Buy my stuff',
        ];

        for ($i = 0; $i < 5; $i++) {
            $this->post(route('public.question', $link->token), $payload);
        }

        $response = $this->post(route('public.question', $link->token), $payload);
        $response->assertStatus(429);
    }
}
