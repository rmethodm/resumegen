<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeJobTaggingTest extends TestCase
{
    use RefreshDatabase;

    public function test_resume_can_be_linked_to_job_application(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $job = JobApplication::factory()->for($user)->create();

        $this->actingAs($user)
            ->patch(route('builder.link-job', $resume), ['job_application_id' => $job->id])
            ->assertRedirect();

        $this->assertEquals($job->id, $resume->fresh()->job_application_id);
    }

    public function test_resume_can_be_unlinked_from_job(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create();
        $resume = Resume::factory()->for($user)->create(['job_application_id' => $job->id]);

        $this->actingAs($user)
            ->patch(route('builder.link-job', $resume), ['job_application_id' => null])
            ->assertRedirect();

        $this->assertNull($resume->fresh()->job_application_id);
    }

    public function test_cannot_link_resume_to_another_users_job(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $otherJob = JobApplication::factory()->for($other)->create();

        $this->actingAs($user)
            ->patch(route('builder.link-job', $resume), ['job_application_id' => $otherJob->id])
            ->assertForbidden();
    }

    // This test will pass once Task 2 wires eager-loading of linkedJob in ResumeBuilderController::index()
    public function test_dashboard_includes_linked_job_for_resumes(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create(['role' => 'SWE', 'company' => 'Google']);
        Resume::factory()->for($user)->create(['job_application_id' => $job->id]);

        $response = $this->actingAs($user)->get(route('builder.index'));

        $response->assertInertia(fn ($page) => $page
            ->component('ResumeBuilder/Index')
            ->where('resumes.0.linked_job.role', 'SWE')
            ->where('resumes.0.linked_job.company', 'Google')
        );
    }

    public function test_unauthenticated_cannot_link_job(): void
    {
        $resume = Resume::factory()->create();

        $this->patch(route('builder.link-job', $resume), ['job_application_id' => null])
            ->assertRedirect(route('login'));
    }
}
