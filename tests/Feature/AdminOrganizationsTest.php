<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\RecruiterNote;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminOrganizationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_org_list_loads(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        Organization::factory()->count(3)->create(['owner_id' => $admin->id]);

        $this->actingAs($admin)
            ->get(route('admin.organizations.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Organizations/Index')
                ->has('organizations.data', 3)
            );
    }

    public function test_org_detail_shows_members(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $org = Organization::factory()->create(['owner_id' => $admin->id]);
        $member = User::factory()->create();
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $member->id,
            'role' => 'member',
            'joined_at' => now(),
        ]);

        $this->actingAs($admin)
            ->get(route('admin.organizations.show', $org))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Organizations/Show')
                ->has('organization.members', 1)
            );
    }

    public function test_delete_org_cascades_members_and_notes(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $owner = User::factory()->create();
        $org = Organization::factory()->create(['owner_id' => $owner->id]);
        $member = User::factory()->create();
        OrganizationMember::create([
            'organization_id' => $org->id,
            'user_id' => $member->id,
            'role' => 'member',
            'joined_at' => now(),
        ]);
        $resume = Resume::factory()->create(['user_id' => $member->id]);
        RecruiterNote::create([
            'organization_id' => $org->id,
            'resume_id' => $resume->id,
            'author_id' => $owner->id,
            'body' => 'test note',
        ]);

        $this->actingAs($admin)
            ->delete(route('admin.organizations.destroy', $org))
            ->assertRedirect(route('admin.organizations.index'));

        $this->assertDatabaseMissing('organizations', ['id' => $org->id]);
        $this->assertDatabaseMissing('organization_members', ['organization_id' => $org->id]);
        $this->assertDatabaseMissing('recruiter_notes', ['organization_id' => $org->id]);
        $this->assertDatabaseHas('users', ['id' => $member->id]);
    }

    public function test_org_section_blocked_for_non_admin(): void
    {
        $user = User::factory()->create();
        $org = Organization::factory()->create(['owner_id' => $user->id]);

        $this->actingAs($user)->get(route('admin.organizations.index'))->assertForbidden();
        $this->actingAs($user)->get(route('admin.organizations.show', $org))->assertForbidden();
        $this->actingAs($user)->delete(route('admin.organizations.destroy', $org))->assertForbidden();
    }
}
