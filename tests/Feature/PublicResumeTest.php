<?php

namespace Tests\Feature;

use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class PublicResumeTest extends TestCase
{
    use RefreshDatabase;

    private function makeLink(bool $active = true, string $tier = 'free'): ResumeShareLink
    {
        $user = User::factory()->create(['plan_tier' => $tier]);
        $resume = $user->resumes()->create(['name' => 'My CV', 'pdf_filename' => 'cv.pdf']);

        return $resume->shareLinks()->create(['is_active' => $active]);
    }

    private function seedPageViews(ResumeShareLink $link, int $count): void
    {
        for ($i = 0; $i < $count; $i++) {
            ResumeShareEvent::create([
                'resume_share_link_id' => $link->id,
                'resume_id' => $link->resume_id,
                'event' => 'page_view',
            ]);
        }
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

    public function test_public_pdf_route_is_rate_limited(): void
    {
        RateLimiter::clear('public-pdf');
        $link = $this->makeLink(true);

        for ($i = 0; $i < 20; $i++) {
            $this->get(route('public.pdf', $link->token));
        }

        $this->get(route('public.pdf', $link->token))->assertStatus(429);
    }

    public function test_public_docx_route_is_rate_limited(): void
    {
        RateLimiter::clear('public-docx');
        $link = $this->makeLink(true, 'starter');

        for ($i = 0; $i < 20; $i++) {
            $this->get(route('public.docx', $link->token));
        }

        $this->get(route('public.docx', $link->token))->assertStatus(429);
    }

    /**
     * DOCX is included on every tier, so a share link published by a free-tier
     * owner must offer the DOCX download just like a paid owner's link does.
     */
    public function test_free_tier_owner_public_docx_is_accessible(): void
    {
        $link = $this->makeLink(true, 'free');
        $this->get(route('public.docx', $link->token))->assertSuccessful();
    }

    public function test_starter_tier_owner_public_docx_is_accessible(): void
    {
        $link = $this->makeLink(true, 'starter');
        // Should not redirect (stream response, assertOk not applicable for streams — just assert not a redirect)
        $response = $this->get(route('public.docx', $link->token));
        $response->assertSuccessful();
    }

    public function test_free_tier_link_is_viewable_under_25_views(): void
    {
        $link = $this->makeLink(true, 'free');
        $this->seedPageViews($link, 24);

        $this->get(route('public.resume', $link->token))->assertOk();
    }

    public function test_free_tier_link_returns_410_at_25_views(): void
    {
        $link = $this->makeLink(true, 'free');
        $this->seedPageViews($link, 25);

        $this->get(route('public.resume', $link->token))->assertStatus(410);
    }

    public function test_pdf_downloads_do_not_count_toward_view_cap(): void
    {
        $link = $this->makeLink(true, 'free');
        for ($i = 0; $i < 25; $i++) {
            ResumeShareEvent::create([
                'resume_share_link_id' => $link->id,
                'resume_id' => $link->resume_id,
                'event' => 'pdf_download',
            ]);
        }

        $this->get(route('public.resume', $link->token))->assertOk();
    }

    public function test_paid_tier_link_has_no_view_cap(): void
    {
        $link = $this->makeLink(true, 'starter');
        $this->seedPageViews($link, 30);

        $this->get(route('public.resume', $link->token))->assertOk();
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
