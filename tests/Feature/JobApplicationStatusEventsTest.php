<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class JobApplicationStatusEventsTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_a_job_application_logs_one_status_event(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('job-applications.store'), [
                'company' => 'Vantage',
                'role' => 'Engineer',
            ])
            ->assertRedirect();

        $jobApplication = JobApplication::where('user_id', $user->id)->first();

        $this->assertDatabaseHas('job_application_status_events', [
            'job_application_id' => $jobApplication->id,
            'from_status' => null,
            'to_status' => 'saved',
        ]);

        $this->assertSame(1, DB::table('job_application_status_events')
            ->where('job_application_id', $jobApplication->id)
            ->count());
    }

    public function test_changing_status_logs_one_event(): void
    {
        $user = User::factory()->create();
        $jobApplication = JobApplication::factory()->for($user)->create(['status' => 'saved']);

        $this->actingAs($user)
            ->patch(route('job-applications.update', $jobApplication), [
                'status' => 'applied',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('job_application_status_events', [
            'job_application_id' => $jobApplication->id,
            'from_status' => 'saved',
            'to_status' => 'applied',
        ]);
    }

    public function test_updating_without_changing_status_logs_no_event(): void
    {
        $user = User::factory()->create();
        $jobApplication = JobApplication::factory()->for($user)->create(['status' => 'saved']);

        $this->actingAs($user)
            ->patch(route('job-applications.update', $jobApplication), [
                'notes' => 'Following up next week',
            ])
            ->assertRedirect();

        $this->assertDatabaseMissing('job_application_status_events', [
            'job_application_id' => $jobApplication->id,
        ]);
    }

    public function test_updating_to_the_same_status_logs_no_event(): void
    {
        $user = User::factory()->create();
        $jobApplication = JobApplication::factory()->for($user)->create(['status' => 'applied']);

        $this->actingAs($user)
            ->patch(route('job-applications.update', $jobApplication), [
                'status' => 'applied',
            ])
            ->assertRedirect();

        $this->assertDatabaseMissing('job_application_status_events', [
            'job_application_id' => $jobApplication->id,
        ]);
    }
}
