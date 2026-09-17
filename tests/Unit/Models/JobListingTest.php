<?php

namespace Tests\Unit\Models;

use App\Models\JobListing;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobListingTest extends TestCase
{
    use RefreshDatabase;

    public function test_external_id_is_unique(): void
    {
        JobListing::factory()->create(['external_id' => 'dup-1']);

        $this->expectException(QueryException::class);

        JobListing::factory()->create(['external_id' => 'dup-1']);
    }

    public function test_fillable_fields_persist(): void
    {
        $listing = JobListing::factory()->create([
            'title' => 'Backend Engineer',
            'company' => 'Acme Corp',
            'location' => 'Remote',
            'job_url' => 'https://example.com/jobs/1',
            'description' => 'Build things.',
        ]);

        $this->assertDatabaseHas('job_listings', [
            'id' => $listing->id,
            'title' => 'Backend Engineer',
            'company' => 'Acme Corp',
        ]);
    }
}
