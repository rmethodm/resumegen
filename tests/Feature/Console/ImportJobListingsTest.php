<?php

namespace Tests\Feature\Console;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ImportJobListingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_imports_and_upserts_by_external_id(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'job-listings').'.jsonl';
        file_put_contents($path, implode("\n", [
            json_encode([
                'external_id' => 'ext-1',
                'title' => 'Backend Engineer',
                'company' => 'Acme Corp',
                'location' => 'Remote',
                'job_url' => 'https://example.com/jobs/1',
                'description' => 'Build things.',
            ]),
            json_encode([
                'external_id' => 'ext-2',
                'title' => 'Frontend Engineer',
                'company' => 'Acme Corp',
                'location' => 'NYC',
                'job_url' => 'https://example.com/jobs/2',
                'description' => null,
            ]),
        ]));

        $this->artisan('app:import-job-listings', ['path' => $path])
            ->assertSuccessful();

        $this->assertDatabaseCount('job_listings', 2);
        $this->assertDatabaseHas('job_listings', ['external_id' => 'ext-1', 'title' => 'Backend Engineer']);

        // Re-run with an updated title for ext-1 — must upsert, not duplicate.
        file_put_contents($path, json_encode([
            'external_id' => 'ext-1',
            'title' => 'Staff Backend Engineer',
            'company' => 'Acme Corp',
            'location' => 'Remote',
            'job_url' => 'https://example.com/jobs/1',
            'description' => 'Build things.',
        ]));

        $this->artisan('app:import-job-listings', ['path' => $path])
            ->assertSuccessful();

        $this->assertDatabaseCount('job_listings', 2);
        $this->assertDatabaseHas('job_listings', ['external_id' => 'ext-1', 'title' => 'Staff Backend Engineer']);

        unlink($path);
    }

    public function test_it_fails_on_missing_file(): void
    {
        $this->artisan('app:import-job-listings', ['path' => '/tmp/does-not-exist.jsonl'])
            ->assertFailed();
    }
}
