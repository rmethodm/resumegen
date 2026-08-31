<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Guest (no-account) resume flow: builder-subdomain template picker creates
 * a guest user + resume; the /w/{token} link is the credential; the slug
 * half of the token is renameable. WHY: the bookmark link is the guest's
 * only way back — if any of this silently breaks, guests lose their resume.
 */
class GuestResumeFlowTest extends TestCase
{
    use RefreshDatabase;

    private function builderUrl(string $path = '/'): string
    {
        return 'http://'.config('app.builder_domain').$path;
    }

    public function test_builder_domain_shows_template_picker(): void
    {
        $this->get($this->builderUrl())
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Builder/TemplatePicker'));
    }

    public function test_start_creates_guest_user_and_resume_and_redirects_to_token_link(): void
    {
        $response = $this->post($this->builderUrl('/start'), ['template' => 'modern']);

        $user = User::query()->whereNotNull('guest_token')->sole();

        $this->assertNotNull($user->email_verified_at);
        // 16-char suffix is the credential's entropy (~82 bits) — shrinking
        // it makes guest links guessable.
        $this->assertMatchesRegularExpression('/^my-resume-[a-z0-9]{16}$/', $user->guest_token);

        $resume = $user->resumes()->sole();
        $this->assertSame('modern', $resume->template);
        $this->assertCount(1, $resume->experiences);

        $response->assertRedirect(
            rtrim(config('app.url'), '/').'/w/'.$user->guest_token.'?welcome=1',
        );
    }

    public function test_start_rejects_unknown_template(): void
    {
        $this->post($this->builderUrl('/start'), ['template' => 'nope'])
            ->assertSessionHasErrors('template');

        $this->assertSame(0, User::query()->count());
    }

    public function test_token_link_logs_guest_in_and_opens_workstation(): void
    {
        $this->post($this->builderUrl('/start'), ['template' => 'classic']);
        $user = User::query()->whereNotNull('guest_token')->sole();
        $resume = $user->resumes()->sole();

        $this->app['auth']->forgetGuards();

        $this->get('/w/'.$user->guest_token.'?welcome=1')
            ->assertRedirect(route('resumes.workstation', $resume));

        $this->assertAuthenticatedAs($user);
    }

    public function test_unknown_token_is_404(): void
    {
        $this->get('/w/not-a-real-token')->assertNotFound();
    }

    public function test_guest_can_rename_slug_but_suffix_stays(): void
    {
        $this->post($this->builderUrl('/start'), ['template' => 'modern']);
        $user = User::query()->whereNotNull('guest_token')->sole();
        $suffix = substr($user->guest_token, -16);

        $this->actingAs($user)
            ->patch(route('guest-link.update'), ['slug' => 'jane-smith'])
            ->assertSessionHasNoErrors();

        $this->assertSame('jane-smith-'.$suffix, $user->fresh()->guest_token);
    }

    public function test_registered_user_cannot_use_guest_link_update(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('guest-link.update'), ['slug' => 'anything'])
            ->assertNotFound();
    }

    public function test_first_visit_to_welcome_redirects_to_builder_domain(): void
    {
        $this->get('/')
            ->assertRedirect('http://'.config('app.builder_domain'))
            ->assertCookie('rg_returning');
    }

    public function test_returning_visitor_sees_welcome_page(): void
    {
        $this->withCookie('rg_returning', '1')
            ->get('/')
            ->assertOk();
    }

    public function test_logged_in_user_is_not_redirected_from_welcome(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/')
            ->assertOk();
    }
}
