<?php

namespace Tests\Feature;

use App\Models\JobSkill;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminJobSkillsTest extends TestCase
{
    use RefreshDatabase;

    public function test_skills_tab_loads_for_master_admin(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        JobSkill::create(['category' => 'Programming', 'name' => 'Go']);

        $this->actingAs($admin)
            ->get(route('admin.job-titles.index', ['tab' => 'skills']))
            ->assertOk();
    }

    public function test_non_admin_is_forbidden(): void
    {
        $user = User::factory()->create(['is_master_admin' => false]);

        $this->actingAs($user)
            ->get(route('admin.job-titles.index', ['tab' => 'skills']))
            ->assertForbidden();
    }

    public function test_can_add_skill_with_category(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post(route('admin.job-skills.store'), ['name' => 'kubernetes', 'category' => 'devops'])
            ->assertRedirect();

        $this->assertDatabaseHas('job_skills', ['name' => 'Kubernetes', 'category' => 'Devops']);
    }

    public function test_can_update_skill_name_and_category(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $skill = JobSkill::create(['category' => 'User Added', 'name' => 'Reactjs']);

        $this->actingAs($admin)
            ->patch(route('admin.job-skills.update', $skill), ['name' => 'React', 'category' => 'Frontend'])
            ->assertRedirect();

        $this->assertDatabaseHas('job_skills', ['id' => $skill->id, 'name' => 'React', 'category' => 'Frontend']);
    }

    public function test_can_delete_skill(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $skill = JobSkill::create(['category' => 'Programming', 'name' => 'Perl']);

        $this->actingAs($admin)
            ->delete(route('admin.job-skills.destroy', $skill))
            ->assertRedirect();

        $this->assertDatabaseMissing('job_skills', ['id' => $skill->id]);
    }

    public function test_can_bulk_delete_skills(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $a = JobSkill::create(['category' => 'Programming', 'name' => 'COBOL']);
        $b = JobSkill::create(['category' => 'Programming', 'name' => 'Fortran']);

        $this->actingAs($admin)
            ->delete(route('admin.job-skills.bulk-destroy'), ['ids' => [$a->id, $b->id]])
            ->assertRedirect();

        $this->assertDatabaseCount('job_skills', 0);
    }

    public function test_search_filter_narrows_skills_list(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        JobSkill::create(['category' => 'Programming', 'name' => 'Python']);
        JobSkill::create(['category' => 'Design', 'name' => 'Figma']);

        $this->actingAs($admin)
            ->get(route('admin.job-titles.index', ['tab' => 'skills', 'q' => 'Pyth']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('skills.data.0.name', 'Python')
                ->where('skills.total', 1)
            );
    }
}
