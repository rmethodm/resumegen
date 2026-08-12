<?php

namespace Tests\Feature;

use App\Models\ImportedJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class JobImportsTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_shows_only_the_authenticated_users_jobs(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        ImportedJob::factory()->for($user)->create(['title' => 'Mine']);
        ImportedJob::factory()->for($other)->create(['title' => 'Not mine']);

        $this->actingAs($user)
            ->get(route('jobs-imports.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Jobs/Imports')
                ->has('jobs', 1)
                ->where('jobs.0.title', 'Mine'));
    }

    public function test_search_returns_empty_when_no_sources_are_configured(): void
    {
        config(['services.adzuna.app_id' => null, 'services.usajobs.key' => null]);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('jobs-imports.search'), ['keyword' => 'designer'])
            ->assertOk()
            ->assertJson(['results' => [], 'sourcesAvailable' => []]);
    }

    public function test_search_normalizes_results_from_configured_sources(): void
    {
        config([
            'services.adzuna.app_id' => 'id',
            'services.adzuna.app_key' => 'key',
            'services.usajobs.key' => null,
        ]);

        Http::fake([
            'api.adzuna.com/*' => Http::response([
                'results' => [[
                    'id' => 'a1',
                    'title' => 'Product Designer',
                    'company' => ['display_name' => 'Vantage'],
                    'location' => ['display_name' => 'Remote'],
                    'redirect_url' => 'https://example.com/a1',
                    'salary_min' => 120000,
                    'salary_max' => 150000,
                    'created' => '2026-08-01T00:00:00Z',
                    'description' => 'Design things.',
                ]],
            ]),
        ]);

        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->post(route('jobs-imports.search'), ['keyword' => 'designer'])
            ->assertOk()
            ->assertJsonPath('sourcesAvailable', ['adzuna'])
            ->assertJsonCount(1, 'results');

        $result = $response->json('results.0');
        $this->assertSame('adzuna', $result['source']);
        $this->assertSame('a1', $result['external_id']);
        $this->assertSame('Product Designer', $result['title']);
        $this->assertSame('$120K–$150K', $result['salary']);
    }

    public function test_store_persists_selected_results_and_dedupes_on_reimport(): void
    {
        $user = User::factory()->create();
        $payload = [
            'jobs' => [[
                'source' => 'adzuna',
                'external_id' => 'a1',
                'title' => 'Product Designer',
                'company' => 'Vantage',
                'location' => 'Remote',
                'url' => 'https://example.com/a1',
                'salary' => '$120K–$150K',
                'description' => 'Design things.',
                'posted_at' => '2026-08-01T00:00:00Z',
            ]],
        ];

        $this->actingAs($user)->post(route('jobs-imports.store'), $payload)->assertRedirect();
        $this->assertSame(1, $user->importedJobs()->count());

        // Re-importing the same listing must not create a duplicate row.
        $this->actingAs($user)->post(route('jobs-imports.store'), $payload)->assertRedirect();
        $this->assertSame(1, $user->importedJobs()->count());
    }

    public function test_store_rejects_non_http_job_url(): void
    {
        $user = User::factory()->create();
        $payload = [
            'jobs' => [[
                'source' => 'adzuna',
                'external_id' => 'a1',
                'title' => 'Product Designer',
                'url' => 'javascript:alert(1)',
            ]],
        ];

        $this->actingAs($user)
            ->post(route('jobs-imports.store'), $payload)
            ->assertSessionHasErrors('jobs.0.url');
    }

    public function test_update_status_rejects_jobs_owned_by_another_user(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $job = ImportedJob::factory()->for($owner)->create(['status' => 'New']);

        $this->actingAs($attacker)
            ->patch(route('jobs-imports.update-status', $job), ['status' => 'Archived'])
            ->assertNotFound();

        $this->assertSame('New', $job->fresh()->status);
    }

    public function test_update_status_updates_own_job(): void
    {
        $user = User::factory()->create();
        $job = ImportedJob::factory()->for($user)->create(['status' => 'New']);

        $this->actingAs($user)
            ->patch(route('jobs-imports.update-status', $job), ['status' => 'Archived'])
            ->assertRedirect();

        $this->assertSame('Archived', $job->fresh()->status);
    }
}
