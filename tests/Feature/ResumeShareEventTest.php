<?php
namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
            'resume_id' => $resume->id,
            'event'     => 'page_view',
        ]);
    }

    public function test_pdf_download_is_logged(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        $this->get(route('public.pdf', $link->token));

        $this->assertDatabaseHas('resume_share_events', [
            'resume_id' => $resume->id,
            'event'     => 'pdf_download',
        ]);
    }

    public function test_question_submitted_is_logged(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        $this->post(route('public.question', $link->token), [
            'sender_name'  => 'Alice',
            'sender_email' => 'alice@example.com',
            'sender_phone' => '555-1234',
            'message'      => 'Hello!',
        ]);

        $this->assertDatabaseHas('resume_share_events', [
            'resume_id' => $resume->id,
            'event'     => 'question_submitted',
        ]);
    }
}
