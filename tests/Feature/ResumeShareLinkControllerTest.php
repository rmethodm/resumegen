<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ResumeShareLinkControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_a_share_link_for_their_resume(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->post(route('resumes.share.store', $resume))
            ->assertRedirect();

        $this->assertDatabaseCount('resume_share_links', 1);
        $this->assertDatabaseHas('resume_share_links', ['resume_id' => $resume->id]);
    }

    public function test_workstation_share_prop_includes_view_history(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['require_email' => true]);
        $link->views()->create(['email' => 'recruiter@example.com']);
        $link->views()->create(['email' => 'hiring@company.com']);

        $this->actingAs($user)
            ->get(route('resumes.workstation', $resume))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Resumes/Workstation')
                ->where('share.id', $link->id)
                ->where('share.view_count', 2)
                ->has('share.views', 2)
                ->where('share.views', fn ($views) => collect($views)->pluck('email')->sort()->values()->all()
                    === ['hiring@company.com', 'recruiter@example.com']));
    }

    public function test_rotating_password_persists_new_value(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create([
            'require_password' => true,
            'password' => 'oldpass1',
        ]);

        $this->actingAs($user)
            ->patch(route('resume-share-links.update', $link), [
                'password' => 'newpass2',
                'require_password' => true,
            ])
            ->assertRedirect();

        // Stored one-way hashed: the new plaintext verifies, the old doesn't.
        $stored = (string) $link->fresh()->password;
        $this->assertTrue(Hash::check('newpass2', $stored));
        $this->assertFalse(Hash::check('oldpass1', $stored));
    }

    public function test_creating_a_share_link_twice_reuses_the_existing_one(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->post(route('resumes.share.store', $resume));
        $this->actingAs($user)->post(route('resumes.share.store', $resume));

        $this->assertDatabaseCount('resume_share_links', 1);
    }

    public function test_generated_token_is_unique_and_non_empty(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->post(route('resumes.share.store', $resume));

        $token = ResumeShareLink::first()->token;

        $this->assertNotEmpty($token);
    }

    public function test_user_cannot_create_a_share_link_for_someone_elses_resume(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->for($other)->create();

        $this->actingAs($user)
            ->post(route('resumes.share.store', $resume))
            ->assertNotFound();

        $this->assertDatabaseCount('resume_share_links', 0);
    }

    public function test_owner_can_toggle_share_link_settings(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create([
            'allow_download' => true,
            'require_email' => false,
        ]);

        $this->actingAs($user)
            ->patch(route('resume-share-links.update', $link), [
                'allow_download' => false,
                'require_email' => true,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('resume_share_links', [
            'id' => $link->id,
            'allow_download' => false,
            'require_email' => true,
        ]);
    }

    public function test_user_cannot_update_someone_elses_share_link(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->for($other)->create();
        $link = ResumeShareLink::factory()->for($resume)->create();

        $this->actingAs($user)
            ->patch(route('resume-share-links.update', $link), ['allow_download' => false])
            ->assertNotFound();
    }

    public function test_owner_can_cancel_a_share_link_and_its_views_are_deleted(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create();
        $link->views()->create(['email' => 'recruiter@example.com']);

        $this->actingAs($user)
            ->delete(route('resume-share-links.destroy', $link))
            ->assertRedirect();

        $this->assertDatabaseMissing('resume_share_links', ['id' => $link->id]);
        $this->assertDatabaseMissing('resume_share_link_views', ['resume_share_link_id' => $link->id]);
    }

    public function test_user_cannot_cancel_someone_elses_share_link(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->for($other)->create();
        $link = ResumeShareLink::factory()->for($resume)->create();

        $this->actingAs($user)
            ->delete(route('resume-share-links.destroy', $link))
            ->assertNotFound();

        $this->assertDatabaseHas('resume_share_links', ['id' => $link->id]);
    }

    /**
     * The server stores only a hash and can never display a password, so
     * silently generating one here would lock every visitor out behind a
     * password nobody has seen. The modal must send a client-generated one.
     */
    public function test_enabling_password_protection_without_a_password_is_rejected(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create();

        $this->actingAs($user)
            ->patch(route('resume-share-links.update', $link), ['require_password' => true])
            ->assertSessionHasErrors('password');

        $link->refresh();

        $this->assertFalse($link->require_password);
        $this->assertNull($link->password);
    }

    public function test_enabling_password_protection_with_a_password_stores_it(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create();

        $this->actingAs($user)
            ->patch(route('resume-share-links.update', $link), [
                'require_password' => true,
                'password' => 'fresh123',
            ])
            ->assertRedirect();

        $link->refresh();

        $this->assertTrue($link->require_password);
        $this->assertTrue(Hash::check('fresh123', (string) $link->password));
    }

    public function test_owner_can_set_their_own_password(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['require_password' => true]);

        $this->actingAs($user)
            ->patch(route('resume-share-links.update', $link), ['password' => 'mypass1'])
            ->assertRedirect();

        $this->assertTrue(Hash::check('mypass1', (string) $link->refresh()->password));
    }

    /**
     * Clearing the hash while the gate stays on would leave a link nothing
     * can unlock — no password matches an empty hash. Turning the gate off
     * is the supported way out.
     */
    public function test_password_cannot_be_cleared_while_protection_stays_on(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create([
            'require_password' => true,
            'password' => 'secret1',
        ]);

        $this->actingAs($user)
            ->patch(route('resume-share-links.update', $link), ['password' => null])
            ->assertSessionHasErrors('password');

        $link->refresh();

        $this->assertTrue($link->require_password);
        $this->assertTrue(Hash::check('secret1', (string) $link->password));
    }

    public function test_password_cannot_exceed_eight_characters(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create();

        $this->actingAs($user)
            ->patch(route('resume-share-links.update', $link), ['password' => 'toolongpassword'])
            ->assertSessionHasErrors('password');
    }

    public function test_owner_can_set_an_expiry_date(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create();

        $this->actingAs($user)
            ->patch(route('resume-share-links.update', $link), ['expires_at' => '2027-01-15'])
            ->assertRedirect();

        $this->assertSame('2027-01-15', $link->refresh()->expires_at->toDateString());
    }

    public function test_owner_can_clear_an_expiry_date(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['expires_at' => now()->addWeek()]);

        $this->actingAs($user)
            ->patch(route('resume-share-links.update', $link), ['expires_at' => null])
            ->assertRedirect();

        $this->assertNull($link->refresh()->expires_at);
    }
}
