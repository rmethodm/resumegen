<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkstationApplicationLinkTest extends TestCase
{
    use RefreshDatabase;

    public function test_workstation_exposes_the_linked_application(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $application = JobApplication::factory()->for($user)->create([
            'resume_id' => $resume->id,
            'company' => 'Linear',
            'role' => 'PM',
            'status' => 'applied',
            'job_url' => 'https://example.com/jobs/pm',
            'job_description' => 'Own the product roadmap.',
        ]);

        $this->actingAs($user)
            ->get(route('resumes.workstation', $resume))
            ->assertInertia(fn ($page) => $page
                ->component('Resumes/Workstation')
                ->where('application.id', $application->id)
                ->where('application.company', 'Linear')
                ->where('application.role', 'PM')
                ->where('application.status', 'applied')
                ->where('application.job_url', 'https://example.com/jobs/pm')
                ->where('application.job_description', 'Own the product roadmap.'));
    }

    public function test_workstation_application_is_null_when_unlinked(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->get(route('resumes.workstation', $resume))
            ->assertInertia(fn ($page) => $page->where('application', null));
    }

    public function test_compare_versions_carry_linked_application_status(): void
    {
        $user = User::factory()->create();
        $base = Resume::factory()->for($user)->create();
        $tailored = Resume::factory()->for($user)->create(['group_id' => $base->group_id]);
        JobApplication::factory()->for($user)->create(['resume_id' => $tailored->id, 'status' => 'interviewing']);

        $this->actingAs($user)
            ->get(route('resume-groups.compare', $base->group_id))
            ->assertInertia(fn ($page) => $page
                ->where('versions.0.application_status', null)
                ->where('versions.1.application_status', 'interviewing'));
    }
}
