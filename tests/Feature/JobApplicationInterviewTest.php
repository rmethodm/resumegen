<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\JobApplicationInterview;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobApplicationInterviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_an_interview_round(): void
    {
        $user = User::factory()->create();
        $jobApplication = JobApplication::factory()->for($user)->create();

        $this->actingAs($user)
            ->post(route('job-application-interviews.store', $jobApplication), [
                'type' => 'phone',
                'scheduled_at' => '2026-10-01 09:00:00',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('job_application_interviews', [
            'job_application_id' => $jobApplication->id,
            'round' => 1,
            'type' => 'phone',
        ]);
    }

    public function test_rounds_increment_per_job_application(): void
    {
        $user = User::factory()->create();
        $jobApplication = JobApplication::factory()->for($user)->create();
        JobApplicationInterview::factory()->for($jobApplication)->create(['round' => 1]);

        $this->actingAs($user)
            ->post(route('job-application-interviews.store', $jobApplication), ['type' => 'onsite'])
            ->assertRedirect();

        $this->assertDatabaseHas('job_application_interviews', [
            'job_application_id' => $jobApplication->id,
            'round' => 2,
            'type' => 'onsite',
        ]);
    }

    public function test_owner_can_update_an_interview(): void
    {
        $user = User::factory()->create();
        $jobApplication = JobApplication::factory()->for($user)->create();
        $interview = JobApplicationInterview::factory()->for($jobApplication)->create(['notes' => null]);

        $this->actingAs($user)
            ->patch(route('job-application-interviews.update', [$jobApplication, $interview]), [
                'notes' => 'Went well',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('job_application_interviews', [
            'id' => $interview->id,
            'notes' => 'Went well',
        ]);
    }

    public function test_owner_can_delete_an_interview(): void
    {
        $user = User::factory()->create();
        $jobApplication = JobApplication::factory()->for($user)->create();
        $interview = JobApplicationInterview::factory()->for($jobApplication)->create();

        $this->actingAs($user)
            ->delete(route('job-application-interviews.destroy', [$jobApplication, $interview]))
            ->assertRedirect();

        $this->assertDatabaseMissing('job_application_interviews', ['id' => $interview->id]);
    }

    public function test_non_owner_cannot_create_an_interview(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $jobApplication = JobApplication::factory()->for($owner)->create();

        $this->actingAs($intruder)
            ->post(route('job-application-interviews.store', $jobApplication), ['type' => 'phone'])
            ->assertNotFound();
    }

    public function test_non_owner_cannot_update_or_delete_an_interview(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $jobApplication = JobApplication::factory()->for($owner)->create();
        $interview = JobApplicationInterview::factory()->for($jobApplication)->create();

        $this->actingAs($intruder)
            ->patch(route('job-application-interviews.update', [$jobApplication, $interview]), ['notes' => 'x'])
            ->assertNotFound();

        $this->actingAs($intruder)
            ->delete(route('job-application-interviews.destroy', [$jobApplication, $interview]))
            ->assertNotFound();

        $this->assertDatabaseHas('job_application_interviews', ['id' => $interview->id]);
    }

    public function test_cannot_update_interview_that_belongs_to_a_different_job_application(): void
    {
        $user = User::factory()->create();
        $jobApplicationA = JobApplication::factory()->for($user)->create();
        $jobApplicationB = JobApplication::factory()->for($user)->create();
        $interview = JobApplicationInterview::factory()->for($jobApplicationB)->create();

        $this->actingAs($user)
            ->patch(route('job-application-interviews.update', [$jobApplicationA, $interview]), ['notes' => 'x'])
            ->assertNotFound();
    }

    public function test_kanban_payload_includes_ordered_interviews(): void
    {
        $user = User::factory()->create();
        $jobApplication = JobApplication::factory()->for($user)->create();
        JobApplicationInterview::factory()->for($jobApplication)->create(['round' => 2, 'type' => 'onsite']);
        JobApplicationInterview::factory()->for($jobApplication)->create(['round' => 1, 'type' => 'phone']);

        $this->actingAs($user)->get(route('job-applications.index'))
            ->assertInertia(fn ($page) => $page
                ->where('applications.0.interviews.0.type', 'phone')
                ->where('applications.0.interviews.1.type', 'onsite')
            );
    }
}
