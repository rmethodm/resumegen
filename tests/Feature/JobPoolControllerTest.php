<?php

namespace Tests\Feature;

use App\Models\JobListing;
use App\Models\JobPoolEntry;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class JobPoolControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_the_users_pool_entries(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $listing = JobListing::factory()->create();
        JobPoolEntry::factory()->create([
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);

        $this->actingAs($user)
            ->get(route('jobs.pool'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Jobs/Pool')
                ->has('entries', 1)
            );
    }

    public function test_it_does_not_list_other_users_entries(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $otherResume = Resume::factory()->for($other)->create();
        $listing = JobListing::factory()->create();
        JobPoolEntry::factory()->create([
            'user_id' => $other->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $otherResume->id,
        ]);

        $this->actingAs($user)
            ->get(route('jobs.pool'))
            ->assertInertia(fn (Assert $page) => $page->has('entries', 0));
    }

    public function test_it_adds_a_listing_to_the_pool(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $listing = JobListing::factory()->create();

        $this->actingAs($user)
            ->post(route('job-pool.store'), [
                'job_listing_id' => $listing->id,
                'resume_id' => $resume->id,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('job_pool_entries', [
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);
    }

    public function test_it_rejects_duplicate_pool_entries(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $listing = JobListing::factory()->create();
        JobPoolEntry::factory()->create([
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);

        $this->actingAs($user)
            ->post(route('job-pool.store'), [
                'job_listing_id' => $listing->id,
                'resume_id' => $resume->id,
            ])
            ->assertSessionHasErrors('job_listing_id');
    }

    public function test_it_rejects_a_resume_owned_by_another_user(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $otherResume = Resume::factory()->for($other)->create();
        $listing = JobListing::factory()->create();

        $this->actingAs($user)
            ->post(route('job-pool.store'), [
                'job_listing_id' => $listing->id,
                'resume_id' => $otherResume->id,
            ])
            ->assertSessionHasErrors('resume_id');
    }

    public function test_it_removes_a_pool_entry(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $listing = JobListing::factory()->create();
        $entry = JobPoolEntry::factory()->create([
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);

        $this->actingAs($user)
            ->delete(route('job-pool.destroy', $entry))
            ->assertRedirect();

        $this->assertDatabaseMissing('job_pool_entries', ['id' => $entry->id]);
    }

    public function test_it_404s_removing_another_users_pool_entry(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $otherResume = Resume::factory()->for($other)->create();
        $listing = JobListing::factory()->create();
        $entry = JobPoolEntry::factory()->create([
            'user_id' => $other->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $otherResume->id,
        ]);

        $this->actingAs($user)
            ->delete(route('job-pool.destroy', $entry))
            ->assertNotFound();

        $this->assertDatabaseHas('job_pool_entries', ['id' => $entry->id]);
    }
}
