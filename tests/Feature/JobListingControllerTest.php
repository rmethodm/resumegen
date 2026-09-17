<?php

namespace Tests\Feature;

use App\Models\JobListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class JobListingControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_job_listings(): void
    {
        $user = User::factory()->create();
        JobListing::factory()->count(3)->create();

        $this->actingAs($user)
            ->get(route('jobs.browse'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Jobs/Browse')
                ->has('listings.data', 3)
            );
    }

    public function test_it_filters_by_keyword(): void
    {
        $user = User::factory()->create();
        JobListing::factory()->create(['title' => 'Backend Engineer']);
        JobListing::factory()->create(['title' => 'Sales Associate']);

        $this->actingAs($user)
            ->get(route('jobs.browse', ['q' => 'Backend']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('listings.data', 1)
                ->where('listings.data.0.title', 'Backend Engineer')
            );
    }

    public function test_it_filters_by_location_and_company(): void
    {
        $user = User::factory()->create();
        JobListing::factory()->create(['company' => 'Acme Corp', 'location' => 'Remote']);
        JobListing::factory()->create(['company' => 'Other Inc', 'location' => 'NYC']);

        $this->actingAs($user)
            ->get(route('jobs.browse', ['company' => 'Acme', 'location' => 'Remote']))
            ->assertInertia(fn (Assert $page) => $page->has('listings.data', 1));
    }

    public function test_guests_are_redirected(): void
    {
        $this->get(route('jobs.browse'))->assertRedirect(route('login'));
    }
}
