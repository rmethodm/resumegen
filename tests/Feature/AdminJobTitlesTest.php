<?php

namespace Tests\Feature;

use App\Models\JobRole;
use App\Models\JobTitle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminJobTitlesTest extends TestCase
{
    use RefreshDatabase;

    public function test_job_titles_page_loads(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        JobRole::create(['title' => 'Software Engineer']);
        JobTitle::create(['title' => 'Senior Software Engineer']);

        $this->actingAs($admin)
            ->get(route('admin.job-titles.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/JobTitles/Index'));
    }

    public function test_can_add_job_role(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post(route('admin.job-roles.store'), ['title' => 'data engineer'])
            ->assertRedirect();

        $this->assertDatabaseHas('job_roles', ['title' => 'Data Engineer']);
    }

    public function test_can_update_job_role(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $role = JobRole::create(['title' => 'Sofware Engneer']);

        $this->actingAs($admin)
            ->patch(route('admin.job-roles.update', $role), ['title' => 'Software Engineer'])
            ->assertRedirect();

        $this->assertDatabaseHas('job_roles', ['id' => $role->id, 'title' => 'Software Engineer']);
    }

    public function test_can_delete_job_role(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $role = JobRole::create(['title' => 'Test Role']);

        $this->actingAs($admin)
            ->delete(route('admin.job-roles.destroy', $role))
            ->assertRedirect();

        $this->assertDatabaseMissing('job_roles', ['id' => $role->id]);
    }

    public function test_can_bulk_delete_job_roles(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $r1 = JobRole::create(['title' => 'Role One']);
        $r2 = JobRole::create(['title' => 'Role Two']);
        $r3 = JobRole::create(['title' => 'Role Three']);

        $this->actingAs($admin)
            ->delete(route('admin.job-roles.bulk-destroy'), ['ids' => [$r1->id, $r2->id]])
            ->assertRedirect();

        $this->assertDatabaseMissing('job_roles', ['id' => $r1->id]);
        $this->assertDatabaseMissing('job_roles', ['id' => $r2->id]);
        $this->assertDatabaseHas('job_roles', ['id' => $r3->id]);
    }

    public function test_can_add_and_update_job_title(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post(route('admin.job-titles.store'), ['title' => 'junior developer'])
            ->assertRedirect();

        $this->assertDatabaseHas('job_titles', ['title' => 'Junior Developer']);

        $title = JobTitle::first();
        $this->actingAs($admin)
            ->patch(route('admin.job-titles.update', $title), ['title' => 'Junior Software Developer'])
            ->assertRedirect();

        $this->assertDatabaseHas('job_titles', ['title' => 'Junior Software Developer']);
    }

    public function test_store_rejects_title_under_2_chars(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $this->actingAs($admin)
            ->post(route('admin.job-roles.store'), ['title' => 'A'])
            ->assertSessionHasErrors('title');
    }

    public function test_update_job_role_rejects_duplicate_title(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        JobRole::create(['title' => 'Existing Role']);
        $role = JobRole::create(['title' => 'Other Role']);

        $this->actingAs($admin)
            ->patch(route('admin.job-roles.update', $role), ['title' => 'Existing Role'])
            ->assertSessionHasErrors('title');
    }

    public function test_blocked_for_non_admin(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->get(route('admin.job-titles.index'))->assertForbidden();
    }
}
