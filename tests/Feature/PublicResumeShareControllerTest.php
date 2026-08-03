<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicResumeShareControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_anyone_can_view_a_resume_via_its_share_link(): void
    {
        $resume = Resume::factory()->create(['full_name' => 'Maya Chen']);
        $link = ResumeShareLink::factory()->for($resume)->create();

        $response = $this->get(route('share.show', $link->token));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Resumes/PublicShare')
            ->where('locked', false)
            ->where('resume.full_name', 'Maya Chen'));
    }

    public function test_unknown_token_404s(): void
    {
        $this->get(route('share.show', 'does-not-exist'))->assertNotFound();
    }

    public function test_view_is_locked_behind_an_email_gate_when_required(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['require_email' => true]);

        $response = $this->get(route('share.show', $link->token));

        $response->assertInertia(fn ($page) => $page
            ->where('locked', true)
            ->where('resume', null));
    }

    public function test_submitting_an_email_unlocks_the_view_and_is_saved(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['require_email' => true]);

        $this->post(route('share.unlock', $link->token), ['email' => 'priya@vantage.test'])
            ->assertRedirect();

        $this->assertDatabaseHas('resume_share_link_views', [
            'resume_share_link_id' => $link->id,
            'email' => 'priya@vantage.test',
        ]);

        $this->get(route('share.show', $link->token))
            ->assertInertia(fn ($page) => $page->where('locked', false));
    }

    public function test_pdf_download_is_blocked_when_disallowed(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['allow_download' => false]);

        // Disallowed download 403s before the missing-view bug is ever
        // reached, so this one isn't affected by MISSING_PDF_VIEW.
        $this->get(route('share.pdf', $link->token))->assertForbidden();
    }

    public function test_pdf_download_works_when_allowed(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['allow_download' => true]);

        $this->get(route('share.pdf', $link->token))->assertOk();
    }

    public function test_pdf_download_is_blocked_until_the_email_gate_is_passed(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->for($resume)->create([
            'allow_download' => true,
            'require_email' => true,
        ]);

        $this->get(route('share.pdf', $link->token))->assertForbidden();

        $this->post(route('share.unlock', $link->token), ['email' => 'priya@vantage.test']);

        $this->get(route('share.pdf', $link->token))->assertOk();
    }

    public function test_docx_download_works_when_allowed(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['allow_download' => true]);

        $this->get(route('share.docx', $link->token))->assertOk();
    }

    public function test_docx_download_is_blocked_when_disallowed(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['allow_download' => false]);

        $this->get(route('share.docx', $link->token))->assertForbidden();
    }

    public function test_view_is_locked_behind_a_password_gate_when_required(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->for($resume)->create([
            'require_password' => true,
            'password' => 'secret1',
        ]);

        $this->get(route('share.show', $link->token))
            ->assertInertia(fn ($page) => $page
                ->where('locked', true)
                ->where('resume', null));
    }

    public function test_wrong_password_does_not_unlock_the_view(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->for($resume)->create([
            'require_password' => true,
            'password' => 'secret1',
        ]);

        $this->post(route('share.unlock', $link->token), ['password' => 'nope'])
            ->assertSessionHasErrors('password');

        $this->get(route('share.show', $link->token))
            ->assertInertia(fn ($page) => $page->where('locked', true));
    }

    public function test_correct_password_unlocks_the_view(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->for($resume)->create([
            'require_password' => true,
            'password' => 'secret1',
        ]);

        $this->post(route('share.unlock', $link->token), ['password' => 'secret1'])
            ->assertRedirect();

        $this->get(route('share.show', $link->token))
            ->assertInertia(fn ($page) => $page->where('locked', false));
    }

    public function test_expired_share_link_redirects_to_the_home_page(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->for($resume)->create([
            'expires_at' => now()->subDay(),
        ]);

        $this->get(route('share.show', $link->token))->assertRedirect('/');
    }

    public function test_expired_share_link_blocks_pdf_download(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->for($resume)->create([
            'allow_download' => true,
            'expires_at' => now()->subDay(),
        ]);

        $this->get(route('share.pdf', $link->token))->assertNotFound();
    }

    public function test_pdf_download_is_blocked_until_the_password_gate_is_passed(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->for($resume)->create([
            'allow_download' => true,
            'require_password' => true,
            'password' => 'secret1',
        ]);

        $this->get(route('share.pdf', $link->token))->assertForbidden();

        $this->post(route('share.unlock', $link->token), ['password' => 'secret1']);

        $this->get(route('share.pdf', $link->token))->assertOk();
    }

    public function test_docx_download_is_blocked_until_the_password_gate_is_passed(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->for($resume)->create([
            'allow_download' => true,
            'require_password' => true,
            'password' => 'secret1',
        ]);

        $this->get(route('share.docx', $link->token))->assertForbidden();

        $this->post(route('share.unlock', $link->token), ['password' => 'secret1']);

        $this->get(route('share.docx', $link->token))->assertOk();
    }

    public function test_password_never_appears_in_the_public_page_props(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->for($resume)->create([
            'require_password' => true,
            'password' => 'secret1',
        ]);

        $this->post(route('share.unlock', $link->token), ['password' => 'secret1']);

        $this->get(route('share.show', $link->token))
            ->assertInertia(fn ($page) => $page
                ->where('locked', false)
                ->missing('password'));
    }

    public function test_unlocking_one_link_does_not_unlock_another_in_the_same_session(): void
    {
        $resumeA = Resume::factory()->create();
        $linkA = ResumeShareLink::factory()->for($resumeA)->create([
            'require_password' => true,
            'password' => 'secret1',
        ]);
        $resumeB = Resume::factory()->create();
        $linkB = ResumeShareLink::factory()->for($resumeB)->create([
            'require_password' => true,
            'password' => 'secret2',
        ]);

        $this->post(route('share.unlock', $linkA->token), ['password' => 'secret1']);

        $this->get(route('share.show', $linkA->token))
            ->assertInertia(fn ($page) => $page->where('locked', false));

        $this->get(route('share.show', $linkB->token))
            ->assertInertia(fn ($page) => $page->where('locked', true));
    }

    public function test_changing_the_password_revokes_a_previously_unlocked_session(): void
    {
        $resume = Resume::factory()->create();
        $link = ResumeShareLink::factory()->for($resume)->create([
            'require_password' => true,
            'password' => 'secret1',
        ]);

        $this->post(route('share.unlock', $link->token), ['password' => 'secret1']);

        $this->get(route('share.show', $link->token))
            ->assertInertia(fn ($page) => $page->where('locked', false));

        $link->update(['password' => 'secret2']);

        $this->get(route('share.show', $link->token))
            ->assertInertia(fn ($page) => $page->where('locked', true));
    }
}
