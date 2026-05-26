<?php
namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

    public function test_inactive_link_returns_403(): void
    {
        $link = $this->makeLink(false);
        $this->get(route('public.resume', $link->token))->assertForbidden();
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

    public function test_question_requires_all_fields(): void
    {
        $link = $this->makeLink(true);
        $this->post(route('public.question', $link->token), [])->assertSessionHasErrors([
            'sender_name', 'sender_email', 'sender_phone', 'message',
        ]);
    }
}
