<?php

namespace Tests\Feature;

use App\Mail\OrgInviteMail;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\RecruiterNote;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class OrgTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_org(): void
    {
        $user = User::factory()->agency()->create();

        $this->actingAs($user)
            ->post(route('org.store'), ['name' => 'Acme Recruiting'])
            ->assertRedirect(route('org.show'));

        $this->assertDatabaseHas('organizations', [
            'name' => 'Acme Recruiting',
            'owner_id' => $user->id,
        ]);

        // Admin member row created
        $this->assertDatabaseHas('organization_members', [
            'user_id' => $user->id,
            'role' => 'admin',
        ]);
    }

    public function test_admin_can_invite_candidate_by_email(): void
    {
        Mail::fake();

        $admin = User::factory()->agency()->create();
        $org = Organization::create(['name' => 'Test Org', 'owner_id' => $admin->id]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'invite_email' => $admin->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);

        $this->actingAs($admin)
            ->post(route('org.invite.store'), ['email' => 'candidate@example.com'])
            ->assertRedirect();

        $this->assertDatabaseHas('organization_members', [
            'organization_id' => $org->id,
            'invite_email' => 'candidate@example.com',
            'role' => 'member',
        ]);

        $member = OrganizationMember::where('invite_email', 'candidate@example.com')->first();
        $this->assertNotNull($member->invite_token);
        $this->assertNull($member->joined_at);

        Mail::assertSent(OrgInviteMail::class, fn ($mail) => $mail->hasTo('candidate@example.com'));
    }

    public function test_candidate_can_accept_invite(): void
    {
        $admin = User::factory()->agency()->create();
        $candidate = User::factory()->create();
        $org = Organization::create(['name' => 'Test Org', 'owner_id' => $admin->id]);

        $member = OrganizationMember::create([
            'organization_id' => $org->id,
            'role' => 'member',
            'invite_email' => $candidate->email,
            'invite_token' => 'abc123token',
            'invited_at' => now(),
        ]);

        $this->actingAs($candidate)
            ->post(route('org.join.store', 'abc123token'))
            ->assertRedirect(route('builder.index'));

        $member->refresh();
        $this->assertEquals($candidate->id, $member->user_id);
        $this->assertNotNull($member->joined_at);
        $this->assertNull($member->invite_token);
    }

    public function test_admin_sees_member_resumes_on_dashboard(): void
    {
        $admin = User::factory()->agency()->create();
        $candidate = User::factory()->create();
        $org = Organization::create(['name' => 'Test Org', 'owner_id' => $admin->id]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'invite_email' => $admin->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $candidate->id,
            'role' => 'member',
            'invite_email' => $candidate->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);

        Resume::factory()->create(['user_id' => $candidate->id, 'name' => 'My Resume']);

        $this->actingAs($admin)
            ->get(route('org.show'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Org/Show')
                ->has('members', 1)
                ->where('members.0.name', $candidate->name)
                ->where('members.0.resume_count', 1)
            );
    }

    public function test_admin_can_upsert_recruiter_note(): void
    {
        $admin = User::factory()->agency()->create();
        $candidate = User::factory()->create();
        $org = Organization::create(['name' => 'Test Org', 'owner_id' => $admin->id]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'invite_email' => $admin->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $candidate->id,
            'role' => 'member',
            'invite_email' => $candidate->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);

        $resume = Resume::factory()->create(['user_id' => $candidate->id]);

        $this->actingAs($admin)
            ->put(route('org.resume.notes', $resume->id), ['body' => 'Strong candidate for the Acme role.'])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertDatabaseHas('recruiter_notes', [
            'organization_id' => $org->id,
            'resume_id' => $resume->id,
            'body' => 'Strong candidate for the Acme role.',
        ]);

        // Upsert: update the note
        $this->actingAs($admin)
            ->put(route('org.resume.notes', $resume->id), ['body' => 'Updated note.'])
            ->assertOk();

        $this->assertEquals(1, RecruiterNote::count());
        $this->assertEquals('Updated note.', RecruiterNote::first()->body);
    }

    public function test_candidate_sees_recruiter_note_in_editor(): void
    {
        $admin = User::factory()->agency()->create();
        $candidate = User::factory()->create();
        $org = Organization::create(['name' => 'Test Org', 'owner_id' => $admin->id]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'invite_email' => $admin->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $candidate->id,
            'role' => 'member',
            'invite_email' => $candidate->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);

        $resume = Resume::factory()->create(['user_id' => $candidate->id]);
        RecruiterNote::create([
            'organization_id' => $org->id,
            'resume_id' => $resume->id,
            'author_id' => $admin->id,
            'body' => 'Great fit for senior roles.',
        ]);

        $this->actingAs($candidate)
            ->get(route('builder.edit', $resume->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('ResumeBuilder/Edit')
                ->where('recruiterNote', 'Great fit for senior roles.')
            );
    }

    public function test_candidate_does_not_see_note_on_other_members_resume(): void
    {
        $admin = User::factory()->agency()->create();
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $org = Organization::create(['name' => 'Test Org', 'owner_id' => $admin->id]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'invite_email' => $admin->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);
        foreach ([$alice, $bob] as $c) {
            OrganizationMember::create([
                'organization_id' => $org->id,
                'user_id' => $c->id,
                'role' => 'member',
                'invite_email' => $c->email,
                'invited_at' => now(),
                'joined_at' => now(),
            ]);
        }

        $aliceResume = Resume::factory()->create(['user_id' => $alice->id]);
        $bobResume = Resume::factory()->create(['user_id' => $bob->id]);

        // Note on Alice's resume
        RecruiterNote::create([
            'organization_id' => $org->id,
            'resume_id' => $aliceResume->id,
            'author_id' => $admin->id,
            'body' => 'Note for Alice.',
        ]);

        // Bob views his own resume — should NOT see Alice's note
        $this->actingAs($bob)
            ->get(route('builder.edit', $bobResume->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('recruiterNote', null)
            );
    }

    public function test_non_admin_cannot_invite(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('org.invite.store'), ['email' => 'x@example.com'])
            ->assertForbidden();
    }

    public function test_invite_token_is_single_use(): void
    {
        $admin = User::factory()->agency()->create();
        $c1 = User::factory()->create();
        $c2 = User::factory()->create();
        $org = Organization::create(['name' => 'Test Org', 'owner_id' => $admin->id]);

        $member = OrganizationMember::create([
            'organization_id' => $org->id,
            'role' => 'member',
            'invite_email' => $c1->email,
            'invite_token' => 'unique-token-xyz',
            'invited_at' => now(),
        ]);

        // First acceptance succeeds
        $this->actingAs($c1)
            ->post(route('org.join.store', 'unique-token-xyz'))
            ->assertRedirect(route('builder.index'));

        // Second acceptance with the same token → 404
        $this->actingAs($c2)
            ->post(route('org.join.store', 'unique-token-xyz'))
            ->assertNotFound();
    }

    public function test_admin_can_remove_member(): void
    {
        $admin = User::factory()->agency()->create();
        $candidate = User::factory()->create();
        $org = Organization::create(['name' => 'Test Org', 'owner_id' => $admin->id]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'invite_email' => $admin->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);
        $member = OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $candidate->id,
            'role' => 'member',
            'invite_email' => $candidate->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);

        $resume = Resume::factory()->create(['user_id' => $candidate->id]);
        RecruiterNote::create([
            'organization_id' => $org->id,
            'resume_id' => $resume->id,
            'author_id' => $admin->id,
            'body' => 'Note survives member removal.',
        ]);

        $this->actingAs($admin)
            ->delete(route('org.invite.destroy', $member->id))
            ->assertRedirect();

        $this->assertDatabaseMissing('organization_members', ['id' => $member->id]);

        // Note survives (cascade is on org/resume, not on member removal)
        $this->assertDatabaseHas('recruiter_notes', ['resume_id' => $resume->id]);
    }

    public function test_org_role_cache_is_cleared_when_member_is_removed(): void
    {
        $admin = User::factory()->agency()->create();
        $candidate = User::factory()->create();
        $org = Organization::create(['name' => 'Acme', 'owner_id' => $admin->id]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'invite_email' => $admin->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);
        $member = OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $candidate->id,
            'role' => 'member',
            'invite_email' => $candidate->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);

        Cache::put("org_role_{$candidate->id}", 'member', 60);

        $this->actingAs($admin)
            ->delete(route('org.invite.destroy', $member->id))
            ->assertRedirect();

        $this->assertFalse(Cache::has("org_role_{$candidate->id}"));
    }

    public function test_org_role_cache_is_cleared_when_member_joins(): void
    {
        $admin = User::factory()->agency()->create();
        $joiner = User::factory()->create();
        $org = Organization::create(['name' => 'Acme', 'owner_id' => $admin->id]);
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'invite_email' => $admin->email,
            'invited_at' => now(),
            'joined_at' => now(),
        ]);
        $invite = OrganizationMember::create([
            'organization_id' => $org->id,
            'role' => 'member',
            'invite_email' => $joiner->email,
            'invite_token' => 'test-token-123',
            'invited_at' => now(),
        ]);

        Cache::put("org_role_{$joiner->id}", 'none', 60);

        $this->actingAs($joiner)
            ->post(route('org.join.store', $invite->invite_token))
            ->assertRedirect();

        $this->assertFalse(Cache::has("org_role_{$joiner->id}"));
    }

    public function test_org_role_cache_is_cleared_when_org_is_created(): void
    {
        $user = User::factory()->agency()->create();

        Cache::put("org_role_{$user->id}", 'none', 60);

        $this->actingAs($user)
            ->post(route('org.store'), ['name' => 'New Org'])
            ->assertRedirect(route('org.show'));

        $this->assertFalse(Cache::has("org_role_{$user->id}"));
    }
}
