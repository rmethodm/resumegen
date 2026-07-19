<?php

namespace Tests\Feature;

use App\Models\JobSearch;
use App\Models\User;
use App\Services\JobBoards\JobQuery;
use App\Services\JobSearchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class JobSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('jobs.adzuna.app_id', 'id');
        config()->set('jobs.adzuna.app_key', 'key');
        config()->set('jobs.usajobs.key', 'key');
        config()->set('jobs.usajobs.email', 'test@example.com');
    }

    private function fakeBoards(array $adzuna = [], array $usaJobs = []): void
    {
        Http::fake([
            'api.adzuna.com/*' => Http::response(['results' => $adzuna]),
            'data.usajobs.gov/*' => Http::response(['SearchResult' => ['SearchResultItems' => $usaJobs]]),
        ]);
    }

    private function adzunaRow(string $id, string $title, string $company): array
    {
        return [
            'id' => $id,
            'title' => $title,
            'company' => ['display_name' => $company],
            'location' => ['display_name' => 'Denver, CO'],
            'redirect_url' => 'https://example.test/'.$id,
            'description' => 'Do the work.',
        ];
    }

    private function usaJobsRow(string $id, string $title, string $company): array
    {
        return [
            'MatchedObjectId' => $id,
            'MatchedObjectDescriptor' => [
                'PositionTitle' => $title,
                'OrganizationName' => $company,
                'PositionLocationDisplay' => 'Denver, CO',
                'PositionURI' => 'https://example.gov/'.$id,
                'QualificationSummary' => 'Serve the public.',
            ],
        ];
    }

    /**
     * The same role is routinely syndicated to more than one board under
     * different ids. Showing it twice makes the result list look padded and
     * wastes a slot in the AI ranking batch.
     */
    public function test_the_same_posting_from_two_boards_appears_once(): void
    {
        $this->fakeBoards(
            adzuna: [$this->adzunaRow('a1', 'Product Manager', 'Acme')],
            usaJobs: [$this->usaJobsRow('u1', 'Product Manager', 'Acme')],
        );

        $results = app(JobSearchService::class)->search(new JobQuery('product manager', 'Denver'));

        $this->assertCount(1, $results);
    }

    /**
     * One board being down must not blank the page. A user with a dead USAJobs
     * key should still see Adzuna results rather than "no jobs found".
     */
    public function test_a_failing_board_still_yields_the_other_boards_results(): void
    {
        Http::fake([
            'api.adzuna.com/*' => Http::response(['results' => [$this->adzunaRow('a1', 'Engineer', 'Acme')]]),
            'data.usajobs.gov/*' => Http::response('down', 500),
        ]);

        $results = app(JobSearchService::class)->search(new JobQuery('engineer', 'Denver'));

        $this->assertCount(1, $results);
        $this->assertSame('Engineer', $results[0]['title']);
    }

    /**
     * A national search means "anywhere". Leaving the location filter attached
     * would silently return local results under a national label.
     */
    public function test_national_scope_drops_the_location_filter(): void
    {
        $this->fakeBoards();

        app(JobSearchService::class)->search(new JobQuery('engineer', 'Denver', 'national'));

        Http::assertSent(function ($request) {
            if (! str_contains($request->url(), 'adzuna')) {
                return true;
            }

            return ! str_contains($request->url(), 'where=') && ! str_contains($request->url(), 'distance=');
        });
    }

    /**
     * Local and state scopes must actually differ, or the scope control is
     * decorative.
     */
    public function test_state_scope_uses_a_wider_radius_than_local(): void
    {
        $this->assertSame(25, (new JobQuery('x', 'Denver', 'local'))->radiusMiles());
        $this->assertSame(150, (new JobQuery('x', 'Denver', 'state'))->radiusMiles());
        $this->assertNull((new JobQuery('x', 'Denver', 'national'))->radiusMiles());
    }

    /**
     * A board with no credentials must be skipped rather than called with null
     * keys — otherwise every search burns a guaranteed-failing request.
     */
    public function test_an_unconfigured_board_is_not_called(): void
    {
        config()->set('jobs.usajobs.key', null);
        $this->fakeBoards(adzuna: [$this->adzunaRow('a1', 'Engineer', 'Acme')]);

        $service = app(JobSearchService::class);
        $service->search(new JobQuery('engineer', 'Denver'));

        $this->assertSame(['adzuna'], $service->configuredKeys());
        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'usajobs'));
    }

    public function test_index_renders_only_the_users_own_saved_searches(): void
    {
        $user = User::factory()->create();
        JobSearch::factory()->for($user)->create(['label' => 'Mine']);
        JobSearch::factory()->create(['label' => 'Theirs']);

        $this->actingAs($user)->get(route('jobs.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Jobs/Index')
                ->has('searches', 1)
                ->where('searches.0.label', 'Mine')
            );
    }

    /**
     * Searching must never spend the AI quota — that is the whole reason
     * ranking is a separate, explicit action.
     */
    public function test_searching_does_not_create_an_ai_request(): void
    {
        $this->fakeBoards(adzuna: [$this->adzunaRow('a1', 'Engineer', 'Acme')]);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson(route('jobs.search'), ['keywords' => 'engineer', 'location' => 'Denver', 'scope' => 'local'])
            ->assertOk()
            ->assertJsonCount(1, 'results');

        $this->assertDatabaseCount('ai_requests', 0);
    }

    public function test_a_user_cannot_delete_another_users_saved_search(): void
    {
        $user = User::factory()->create();
        $theirs = JobSearch::factory()->create();

        $this->actingAs($user)
            ->delete(route('jobs.saved.destroy', $theirs))
            ->assertForbidden();

        $this->assertDatabaseHas('job_searches', ['id' => $theirs->id]);
    }
}
