<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobApplicationTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_lists_only_my_applications(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        JobApplication::factory()->for($me)->create();
        JobApplication::factory()->for($other)->create();

        $this->actingAs($me)
            ->get(route('jobs.index'))
            ->assertOk()
            ->assertInertia(fn ($p) => $p->component('Jobs/Index')->has('applications', 1));
    }

    public function test_store_creates_application(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('jobs.store'), [
                'company' => 'Acme',
                'role' => 'Engineer',
                'status' => 'applied',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('job_applications', [
            'user_id' => $user->id,
            'company' => 'Acme',
            'role' => 'Engineer',
            'status' => 'applied',
        ]);
    }

    public function test_store_validates_status_enum(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('jobs.store'), [
                'company' => 'Acme',
                'role' => 'Engineer',
                'status' => 'bogus',
            ])
            ->assertSessionHasErrors('status');
    }

    public function test_update_persists_changes(): void
    {
        $user = User::factory()->create();
        $app = JobApplication::factory()->for($user)->create(['status' => 'saved']);

        $this->actingAs($user)
            ->put(route('jobs.update', $app->id), [
                'company' => 'Acme',
                'role' => 'Engineer',
                'status' => 'interviewing',
                'notes' => 'Phone screen Friday',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('job_applications', [
            'id' => $app->id,
            'status' => 'interviewing',
            'notes' => 'Phone screen Friday',
        ]);
    }

    public function test_other_user_cannot_update(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $app = JobApplication::factory()->for($owner)->create();

        $this->actingAs($other)
            ->put(route('jobs.update', $app->id), [
                'company' => 'X',
                'role' => 'Y',
                'status' => 'saved',
            ])
            ->assertForbidden();
    }

    public function test_destroy_deletes_application(): void
    {
        $user = User::factory()->create();
        $app = JobApplication::factory()->for($user)->create();

        $this->actingAs($user)
            ->delete(route('jobs.destroy', $app->id))
            ->assertRedirect();

        $this->assertDatabaseMissing('job_applications', ['id' => $app->id]);
    }

    public function test_free_user_at_job_limit_is_blocked(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        JobApplication::factory()->count(3)->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('jobs.store'), [
                'company' => 'Acme Corp',
                'role' => 'Engineer',
                'status' => 'applied',
            ])
            ->assertRedirect()
            ->assertSessionHas('featureGate.feature', 'job_limit');
    }

    public function test_starter_user_has_unlimited_jobs(): void
    {
        $user = User::factory()->starter()->create();
        JobApplication::factory()->count(10)->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('jobs.store'), [
                'company' => 'Acme Corp',
                'role' => 'Engineer',
                'status' => 'applied',
            ])
            ->assertRedirect()
            ->assertSessionMissing('featureGate');
    }

    public function test_free_user_below_job_limit_can_create(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        JobApplication::factory()->count(2)->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('jobs.store'), [
                'company' => 'Acme Corp',
                'role' => 'Engineer',
                'status' => 'applied',
            ])
            ->assertRedirect()
            ->assertSessionMissing('featureGate');
    }

    public function test_index_includes_funnel_stats(): void
    {
        $user = User::factory()->create();

        JobApplication::factory()->for($user)->create(['status' => 'applied']);
        JobApplication::factory()->for($user)->create(['status' => 'applied']);
        JobApplication::factory()->for($user)->create(['status' => 'interviewing']);
        JobApplication::factory()->for($user)->create(['status' => 'offered']);
        JobApplication::factory()->for($user)->create(['status' => 'saved']);
        JobApplication::factory()->for($user)->create(['status' => 'rejected']);

        // Another user's application — must not appear in counts
        $other = User::factory()->create();
        JobApplication::factory()->for($other)->create(['status' => 'applied']);

        $this->actingAs($user)
            ->get(route('jobs.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Jobs/Index')
                ->where('funnelStats.applied', 2)
                ->where('funnelStats.interviewing', 1)
                ->where('funnelStats.offered', 1)
                ->where('funnelStats.saved', 1)
                ->where('funnelStats.rejected', 1)
                ->where('funnelStats.closed', 0)
            );
    }

    public function test_jobs_index_loads_for_authenticated_user(): void
    {
        $user = User::factory()->pro()->create();
        JobApplication::factory()->count(3)->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->get(route('jobs.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Jobs/Index')
                ->has('applications', 3)
            );
    }

    public function test_jobs_index_includes_created_at_in_applications(): void
    {
        $user = User::factory()->create();
        JobApplication::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->get(route('jobs.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Jobs/Index')
                ->where('applications.0.created_at', fn ($v) => is_string($v) && strlen($v) > 0)
            );
    }

    public function test_kanban_drag_updates_job_status(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->create([
            'user_id' => $user->id,
            'status' => 'saved',
        ]);

        $this->actingAs($user)
            ->put(route('jobs.update', $job), ['status' => 'applied'])
            ->assertRedirect();

        $this->assertEquals('applied', $job->fresh()->status);
    }
}
