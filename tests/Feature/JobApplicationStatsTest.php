<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobApplicationStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_stats_reflect_current_state_funnel_and_transitions(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('job-applications.store'), [
            'company' => 'Vantage',
            'role' => 'Engineer',
        ]);
        $jobApplication = JobApplication::where('user_id', $user->id)->first();

        $this->actingAs($user)->patch(route('job-applications.update', $jobApplication), ['status' => 'applied']);
        $this->actingAs($user)->patch(route('job-applications.update', $jobApplication), ['status' => 'interviewing']);

        $this->actingAs($user)
            ->get(route('job-applications.stats'))
            ->assertInertia(fn ($page) => $page
                ->component('Jobs/Stats')
                ->where('funnel', [
                    ['status' => 'saved', 'count' => 0],
                    ['status' => 'applied', 'count' => 0],
                    ['status' => 'interviewing', 'count' => 1],
                    ['status' => 'offer', 'count' => 0],
                    ['status' => 'rejected', 'count' => 0],
                ])
                ->has('transitions', 3)
                ->where('transitions.0', ['source' => 'start', 'target' => 'saved', 'value' => 1])
                ->where('transitions.1', ['source' => 'saved', 'target' => 'applied', 'value' => 1])
                ->where('transitions.2', ['source' => 'applied', 'target' => 'interviewing', 'value' => 1])
            );
    }

    public function test_stats_are_scoped_to_the_requesting_user(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        JobApplication::factory()->for($other)->create(['status' => 'offer']);
        JobApplication::factory()->for($user)->create(['status' => 'saved']);

        $this->actingAs($user)
            ->get(route('job-applications.stats'))
            ->assertInertia(fn ($page) => $page
                ->where('funnel.0', ['status' => 'saved', 'count' => 1])
                ->where('funnel.3', ['status' => 'offer', 'count' => 0])
            );
    }
}
