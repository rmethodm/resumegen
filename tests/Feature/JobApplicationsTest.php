<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobApplicationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_shows_only_the_authenticated_users_applications(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        JobApplication::factory()->for($user)->create(['company' => 'Mine Inc']);
        JobApplication::factory()->for($other)->create(['company' => 'Not Mine Inc']);

        $this->actingAs($user)
            ->get(route('job-applications.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Jobs/Kanban')
                ->has('applications', 1)
                ->where('applications.0.company', 'Mine Inc'));
    }

    public function test_store_creates_an_application_with_default_status(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('job-applications.store'), [
            'company' => 'Linear',
            'role' => 'Senior Product Manager',
        ])->assertRedirect();

        $this->assertSame(1, $user->jobApplications()->count());
        $this->assertSame('saved', $user->jobApplications()->first()->status);
    }

    public function test_update_changes_status_for_drag_and_drop(): void
    {
        $user = User::factory()->create();
        $application = JobApplication::factory()->for($user)->create(['status' => 'saved']);

        $this->actingAs($user)
            ->patch(route('job-applications.update', $application), ['status' => 'applied'])
            ->assertRedirect();

        $this->assertSame('applied', $application->fresh()->status);
    }

    public function test_update_saves_full_edit_form(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['title' => 'Product Manager — v3']);
        $application = JobApplication::factory()->for($user)->create();

        $this->actingAs($user)->patch(route('job-applications.update', $application), [
            'company' => 'Vantage Health',
            'role' => 'Product Manager',
            'resume_id' => $resume->id,
            'status' => 'interviewing',
            'follow_up_at' => '2026-08-14',
        ])->assertRedirect();

        $application->refresh();
        $this->assertSame('Vantage Health', $application->company);
        $this->assertSame($resume->id, $application->resume_id);
        $this->assertSame('interviewing', $application->status);
        $this->assertSame('2026-08-14', $application->follow_up_at->toDateString());
    }

    public function test_update_rejects_another_users_application(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $application = JobApplication::factory()->for($owner)->create();

        $this->actingAs($attacker)
            ->patch(route('job-applications.update', $application), ['status' => 'rejected'])
            ->assertNotFound();

        $this->assertSame('saved', $application->fresh()->status);
    }

    public function test_destroy_removes_own_application(): void
    {
        $user = User::factory()->create();
        $application = JobApplication::factory()->for($user)->create();

        $this->actingAs($user)
            ->delete(route('job-applications.destroy', $application))
            ->assertRedirect();

        $this->assertModelMissing($application);
    }

    public function test_destroy_rejects_another_users_application(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $application = JobApplication::factory()->for($owner)->create();

        $this->actingAs($attacker)
            ->delete(route('job-applications.destroy', $application))
            ->assertNotFound();

        $this->assertModelExists($application);
    }
}
