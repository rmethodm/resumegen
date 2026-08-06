<?php

namespace Tests\Feature;

use App\Models\ScrapedJob;
use App\Models\User;
use App\Services\JobImport\CareerPageScraper;
use App\Services\JobImport\GreenhouseClient;
use App\Services\JobImport\JobImportSearch;
use App\Services\JobImport\JobScrapePool;
use App\Services\JobImport\LeverClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class JobScrapeTest extends TestCase
{
    use RefreshDatabase;

    public function test_greenhouse_client_maps_listings(): void
    {
        Http::fake([
            'boards-api.greenhouse.io/v1/boards/acme/jobs*' => Http::response([
                'jobs' => [[
                    'id' => 111,
                    'title' => 'Engineer',
                    'location' => ['name' => 'Remote'],
                    'absolute_url' => 'https://acme.com/jobs/111',
                    'content' => '<p>Build things</p>',
                    'updated_at' => '2026-08-01T00:00:00Z',
                ]],
            ]),
        ]);

        $jobs = app(GreenhouseClient::class)->fetch('acme');

        $this->assertCount(1, $jobs);
        $this->assertSame('greenhouse', $jobs[0]['source']);
        $this->assertSame('111', $jobs[0]['external_id']);
        $this->assertSame('Engineer', $jobs[0]['title']);
        $this->assertSame('Acme', $jobs[0]['company']);
        $this->assertSame('Remote', $jobs[0]['location']);
    }

    public function test_lever_client_maps_listings(): void
    {
        Http::fake([
            'api.lever.co/v0/postings/acme*' => Http::response([[
                'id' => 'abc123',
                'text' => 'Designer',
                'categories' => ['location' => 'NYC'],
                'hostedUrl' => 'https://jobs.lever.co/acme/abc123',
                'createdAt' => 1735689600000,
                'descriptionPlain' => 'Design stuff',
            ]]),
        ]);

        $jobs = app(LeverClient::class)->fetch('acme');

        $this->assertCount(1, $jobs);
        $this->assertSame('lever', $jobs[0]['source']);
        $this->assertSame('abc123', $jobs[0]['external_id']);
        $this->assertSame('Designer', $jobs[0]['title']);
        $this->assertSame('NYC', $jobs[0]['location']);
        $this->assertNotNull($jobs[0]['posted_at']);
    }

    public function test_career_page_scraper_extracts_json_ld_job_posting(): void
    {
        $html = <<<'HTML'
            <html><head><script type="application/ld+json">
            {"@context":"https://schema.org","@type":"JobPosting","title":"Backend Engineer",
            "hiringOrganization":{"name":"Acme"},
            "jobLocation":{"address":{"addressLocality":"Austin","addressRegion":"TX"}},
            "description":"<p>Do stuff</p>","datePosted":"2026-07-01",
            "identifier":{"value":"job-42"}}
            </script></head><body></body></html>
            HTML;

        Http::fake([
            'example.com/robots.txt' => Http::response("User-agent: *\nDisallow:\n"),
            'example.com/careers' => Http::response($html),
        ]);

        $job = app(CareerPageScraper::class)->fetch('https://example.com/careers');

        $this->assertNotNull($job);
        $this->assertSame('career_page', $job['source']);
        $this->assertSame('job-42', $job['external_id']);
        $this->assertSame('Backend Engineer', $job['title']);
        $this->assertSame('Acme', $job['company']);
        $this->assertSame('Austin, TX', $job['location']);
        $this->assertSame('Do stuff', $job['description']);
        $this->assertSame('2026-07-01', $job['posted_at']);
    }

    public function test_career_page_scraper_returns_null_without_job_posting_markup(): void
    {
        Http::fake([
            'example.com/robots.txt' => Http::response("User-agent: *\nDisallow:\n"),
            'example.com/no-jsonld' => Http::response('<html><body>No jobs here</body></html>'),
        ]);

        $job = app(CareerPageScraper::class)->fetch('https://example.com/no-jsonld');

        $this->assertNull($job);
    }

    public function test_career_page_scraper_honors_robots_disallow(): void
    {
        Http::fake([
            'example.com/robots.txt' => Http::response("User-agent: *\nDisallow: /careers\n"),
        ]);

        $job = app(CareerPageScraper::class)->fetch('https://example.com/careers');

        $this->assertNull($job);
        Http::assertNotSent(fn ($request) => $request->url() === 'https://example.com/careers');
    }

    public function test_job_scrape_pool_stores_and_dedupes_within_politeness_window(): void
    {
        config([
            'job_scrape_sources.greenhouse' => ['acme'],
            'job_scrape_sources.lever' => [],
            'job_scrape_sources.career_pages' => [],
        ]);

        Http::fake([
            'boards-api.greenhouse.io/v1/boards/acme/jobs*' => Http::response([
                'jobs' => [[
                    'id' => 111,
                    'title' => 'Engineer',
                    'location' => ['name' => 'Remote'],
                    'absolute_url' => 'https://acme.com/jobs/111',
                    'content' => 'Build things',
                    'updated_at' => '2026-08-01T00:00:00Z',
                ]],
            ]),
        ]);

        $pool = app(JobScrapePool::class);
        $pool->refresh();
        $pool->refresh();

        $this->assertSame(1, ScrapedJob::count());
        Http::assertSentCount(1);
    }

    public function test_job_import_search_blends_in_the_scraped_pool(): void
    {
        config(['services.adzuna.app_id' => null, 'services.usajobs.key' => null]);

        ScrapedJob::factory()->create([
            'source' => 'greenhouse',
            'title' => 'Product Designer',
            'location' => 'Remote',
        ]);

        $results = app(JobImportSearch::class)->search('Designer', null);

        $this->assertCount(1, $results);
        $this->assertSame('greenhouse', $results[0]['source']);
        $this->assertSame('Product Designer', $results[0]['title']);
    }

    public function test_store_accepts_scraped_sources(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('jobs-imports.store'), [
            'jobs' => [[
                'source' => 'greenhouse',
                'external_id' => '111',
                'title' => 'Engineer',
            ]],
        ])->assertRedirect();

        $this->assertSame(1, $user->importedJobs()->count());
    }
}
