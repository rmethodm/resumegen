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
                'role'    => 'Engineer',
                'status'  => 'applied',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('job_applications', [
            'user_id' => $user->id,
            'company' => 'Acme',
            'role'    => 'Engineer',
            'status'  => 'applied',
        ]);
    }

    public function test_store_validates_status_enum(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('jobs.store'), [
                'company' => 'Acme',
                'role'    => 'Engineer',
                'status'  => 'bogus',
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
                'role'    => 'Engineer',
                'status'  => 'interviewing',
                'notes'   => 'Phone screen Friday',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('job_applications', [
            'id'     => $app->id,
            'status' => 'interviewing',
            'notes'  => 'Phone screen Friday',
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
                'role'    => 'Y',
                'status'  => 'saved',
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
}
