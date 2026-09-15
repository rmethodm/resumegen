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
        ]);

        $this->actingAs($user)
            ->get(route('resumes.workstation', $resume))
            ->assertInertia(fn ($page) => $page
                ->component('Resumes/Workstation')
                ->where('application.id', $application->id)
                ->where('application.company', 'Linear')
                ->where('application.role', 'PM')
                ->where('application.status', 'applied'));
    }

    public function test_workstation_application_is_null_when_unlinked(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->get(route('resumes.workstation', $resume))
            ->assertInertia(fn ($page) => $page->where('application', null));
    }
}
