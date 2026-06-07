<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KanbanJobTrackerTest extends TestCase
{
    use RefreshDatabase;

    public function test_jobs_index_loads_with_applications(): void
    {
        $user = User::factory()->create();
        JobApplication::factory()->for($user)->create(['company' => 'Acme', 'status' => 'applied']);
        JobApplication::factory()->for($user)->create(['company' => 'Globex', 'status' => 'interviewing']);

        $this->actingAs($user)
            ->get(route('jobs.index'))
            ->assertInertia(fn ($page) => $page->component('Jobs/Index')
                ->has('applications', 2)
            );
    }

    public function test_drag_status_update_persists(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create(['status' => 'saved']);

        $this->actingAs($user)
            ->put(route('jobs.update', $job), ['status' => 'applied'])
            ->assertRedirect();

        $this->assertDatabaseHas('job_applications', ['id' => $job->id, 'status' => 'applied']);
    }

    public function test_invalid_status_rejected(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create(['status' => 'saved']);

        $this->actingAs($user)
            ->put(route('jobs.update', $job), ['status' => 'not_a_real_status'])
            ->assertSessionHasErrors('status');
    }

    public function test_other_user_cannot_update_status(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $job = JobApplication::factory()->for($owner)->create(['status' => 'saved']);

        $this->actingAs($other)
            ->put(route('jobs.update', $job), ['status' => 'applied'])
            ->assertForbidden();
    }
}
