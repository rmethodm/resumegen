<?php

namespace Tests\Unit\Models;

use App\Models\JobListing;
use App\Models\JobPoolEntry;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobPoolEntryTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_cannot_pool_the_same_listing_twice(): void
    {
        $user = User::factory()->create();
        $listing = JobListing::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        JobPoolEntry::factory()->create([
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);

        $this->expectException(QueryException::class);

        JobPoolEntry::factory()->create([
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);
    }

    public function test_deleting_user_cascades_to_pool_entries(): void
    {
        $user = User::factory()->create();
        $listing = JobListing::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $entry = JobPoolEntry::factory()->create([
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);

        $user->delete();

        $this->assertDatabaseMissing('job_pool_entries', ['id' => $entry->id]);
    }

    public function test_user_job_pool_entries_relation(): void
    {
        $user = User::factory()->create();
        $listing = JobListing::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        JobPoolEntry::factory()->create([
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);

        $this->assertCount(1, $user->fresh()->jobPoolEntries);
    }
}
