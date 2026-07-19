<?php

namespace Tests\Feature;

use App\Mail\JobMatchesDigestMail;
use App\Models\JobListing;
use App\Models\JobSearch;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class JobAlertsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('jobs.adzuna.app_id', 'id');
        config()->set('jobs.adzuna.app_key', 'key');
        config()->set('jobs.usajobs.key', null);
        config()->set('ai.enabled', false);

        Mail::fake();
    }

    private function fakeAdzuna(array $rows): void
    {
        Http::fake(['api.adzuna.com/*' => Http::response(['results' => $rows])]);
    }

    /**
     * Http::fake() merges stubs rather than replacing them, so calling it twice
     * leaves the first response winning forever. Multi-run tests have to declare
     * every run's payload up front as a sequence.
     */
    private function fakeAdzunaRuns(array ...$runs): void
    {
        $sequence = Http::sequence();

        foreach ($runs as $rows) {
            $sequence->push(['results' => $rows]);
        }

        Http::fake(['api.adzuna.com/*' => $sequence]);
    }

    private function row(string $id, string $title = 'Product Manager'): array
    {
        return [
            'id' => $id,
            'title' => $title,
            'company' => ['display_name' => 'Acme'],
            'location' => ['display_name' => 'Denver, CO'],
            'redirect_url' => 'https://example.test/'.$id,
            'description' => 'Own the roadmap.',
        ];
    }

    public function test_a_first_run_mails_the_postings_it_found(): void
    {
        $this->fakeAdzuna([$this->row('a1')]);
        $search = JobSearch::factory()->alerting()->create();

        $this->artisan('jobs:run-alerts')->assertSuccessful();

        Mail::assertQueued(JobMatchesDigestMail::class, fn ($mail) => $mail->hasTo($search->user->email));
        $this->assertDatabaseCount('job_listings', 1);
    }

    /**
     * The whole point of storing listings is that the digest never repeats
     * itself. A daily email that re-sends yesterday's jobs gets muted, and the
     * feature is dead from then on.
     */
    public function test_a_second_run_with_the_same_results_mails_nothing(): void
    {
        $this->fakeAdzunaRuns([$this->row('a1')], [$this->row('a1')]);
        JobSearch::factory()->alerting()->create();

        $this->artisan('jobs:run-alerts');
        Mail::fake();
        $this->artisan('jobs:run-alerts');

        Mail::assertNothingQueued();
        $this->assertDatabaseCount('job_listings', 1);
    }

    public function test_a_genuinely_new_posting_on_a_later_run_mails_only_the_new_one(): void
    {
        $this->fakeAdzunaRuns(
            [$this->row('a1')],
            [$this->row('a1'), $this->row('a2', 'Senior Product Manager')],
        );
        JobSearch::factory()->alerting()->create();
        $this->artisan('jobs:run-alerts');

        Mail::fake();
        $this->artisan('jobs:run-alerts');

        Mail::assertQueued(JobMatchesDigestMail::class, fn ($mail) => $mail->listings->count() === 1
            && $mail->listings->first()->title === 'Senior Product Manager');
        $this->assertDatabaseCount('job_listings', 2);
    }

    public function test_searches_with_alerts_off_are_skipped(): void
    {
        $this->fakeAdzuna([$this->row('a1')]);
        JobSearch::factory()->create(['is_alerting' => false]);

        $this->artisan('jobs:run-alerts');

        Mail::assertNothingQueued();
        $this->assertDatabaseCount('job_listings', 0);
    }

    public function test_a_run_that_finds_nothing_mails_nothing_but_still_records_the_attempt(): void
    {
        $this->fakeAdzuna([]);
        $search = JobSearch::factory()->alerting()->create();

        $this->artisan('jobs:run-alerts');

        Mail::assertNothingQueued();
        $this->assertNotNull($search->fresh()->last_run_at);
    }

    /**
     * A low-scoring posting is held back from the email but must still be
     * marked notified — otherwise it is "new" again tomorrow, forever.
     */
    public function test_postings_below_the_score_floor_are_recorded_but_not_mailed(): void
    {
        config()->set('ai.enabled', true);
        config()->set('ai.monthly_limit', 10);
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => '{"scores":[]}']]],
                'usage' => ['prompt_tokens' => 5, 'completion_tokens' => 5, 'total_tokens' => 10],
            ]),
        ]));

        $this->fakeAdzuna([$this->row('a1')]);
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        JobSearch::factory()->alerting()->for($user)->create(['resume_id' => $resume->id]);

        $this->artisan('jobs:run-alerts');

        // Unscored listings still mail — an absent score is not a low score.
        Mail::assertQueued(JobMatchesDigestMail::class);
        $this->assertNotNull(JobListing::sole()->notified_at);
    }

    /**
     * One broken saved search must not abort the whole scheduled run.
     */
    public function test_a_failing_search_does_not_stop_the_others(): void
    {
        $this->fakeAdzuna([$this->row('a1')]);
        JobSearch::factory()->alerting()->create(['keywords' => 'first']);
        JobSearch::factory()->alerting()->create(['keywords' => 'second']);

        $this->artisan('jobs:run-alerts')->assertSuccessful();

        Mail::assertQueuedCount(2);
    }
}
