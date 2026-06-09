<?php

namespace Tests\Feature;

use App\Models\CoverLetter;
use App\Models\JobApplication;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUsersEnhancedTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_list_includes_extra_counts(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $user = User::factory()->create();
        Resume::factory()->count(3)->create(['user_id' => $user->id]);
        CoverLetter::factory()->count(2)->create(['user_id' => $user->id]);
        JobApplication::factory()->count(1)->create(['user_id' => $user->id]);

        $this->actingAs($admin)
            ->get(route('admin.users.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Users/Index')
                ->has('users.data', 2)
                ->where('users.data.1.resumes_count', 3)
                ->where('users.data.1.cover_letters_count', 2)
                ->where('users.data.1.job_applications_count', 1)
            );
    }

    public function test_users_list_filters_by_name(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        User::factory()->create(['name' => 'Alice Smith']);
        User::factory()->create(['name' => 'Bob Jones']);

        $this->actingAs($admin)
            ->get(route('admin.users.index', ['q' => 'Alice']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('users.data', 1));
    }

    public function test_users_list_filters_by_plan(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        User::factory()->pro()->create();
        User::factory()->free()->create();

        $this->actingAs($admin)
            ->get(route('admin.users.index', ['plan' => 'pro']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('users.data', 1));
    }
}
