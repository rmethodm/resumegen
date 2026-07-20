<?php

namespace Tests\Feature;

use App\Jobs\ResolveShareEventGeo;
use App\Models\Resume;
use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ResumeShareEventTest extends TestCase
{
    use RefreshDatabase;

    public function test_page_view_is_logged_on_public_show(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        $this->get(route('public.resume', $link->token));

        $this->assertDatabaseHas('resume_share_events', [
            'resume_share_link_id' => $link->id,
            'resume_id' => $resume->id,
            'event' => 'page_view',
        ]);
    }

    public function test_pdf_download_is_logged(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        $this->get(route('public.pdf', $link->token));

        $this->assertDatabaseHas('resume_share_events', [
            'resume_share_link_id' => $link->id,
            'resume_id' => $resume->id,
            'event' => 'pdf_download',
        ]);
    }

    public function test_docx_download_is_logged(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        $this->get(route('public.docx', $link->token));

        $this->assertDatabaseHas('resume_share_events', [
            'resume_share_link_id' => $link->id,
            'resume_id' => $resume->id,
            'event' => 'docx_download',
        ]);
    }

    public function test_question_submitted_is_logged(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id, 'is_active' => true]);

        $this->post(route('public.thread.store', $link->token), [
            'sender_name' => 'Alice',
            'sender_email' => 'alice@example.com',
            'message' => 'Hello!',
        ]);

        $this->assertDatabaseHas('resume_share_events', [
            'resume_share_link_id' => $link->id,
            'resume_id' => $resume->id,
            'event' => 'question_submitted',
        ]);
    }

    public function test_view_duration_is_logged_from_the_beacon(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id, 'is_active' => true]);

        $this->postJson(route('public.section-events', $link->token), [
            'sections' => [],
            'duration_ms' => 42000,
        ])->assertOk();

        $this->assertDatabaseHas('resume_share_events', [
            'resume_share_link_id' => $link->id,
            'event' => 'view_duration',
            'duration_ms' => 42000,
        ]);
    }

    public function test_view_duration_is_capped_at_thirty_minutes(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id, 'is_active' => true]);

        $this->postJson(route('public.section-events', $link->token), [
            'sections' => [],
            'duration_ms' => 99999999,
        ]);

        $this->assertDatabaseHas('resume_share_events', [
            'event' => 'view_duration',
            'duration_ms' => 1800000,
        ]);
    }

    public function test_page_view_geo_is_resolved_for_public_ips(): void
    {
        Http::fake([
            'ip-api.com/*' => Http::response([
                'status' => 'success',
                'country' => 'United States',
                'regionName' => 'California',
                'city' => 'Mountain View',
            ]),
        ]);

        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        $event = ResumeShareEvent::create([
            'resume_share_link_id' => $link->id,
            'resume_id' => $resume->id,
            'event' => 'page_view',
        ]);

        (new ResolveShareEventGeo($event, '8.8.8.8'))->handle();

        $this->assertDatabaseHas('resume_share_events', [
            'id' => $event->id,
            'country' => 'United States',
            'region' => 'California',
            'city' => 'Mountain View',
        ]);
    }

    public function test_geo_lookup_is_skipped_for_private_ips(): void
    {
        Http::fake();

        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        // Test requests come from 127.0.0.1 — page_view dispatches the geo job,
        // which must bail before any HTTP call.
        $this->get(route('public.resume', $link->token));

        Http::assertNothingSent();
        $this->assertDatabaseHas('resume_share_events', ['event' => 'page_view', 'country' => null]);
    }
}
