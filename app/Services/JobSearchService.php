<?php

namespace App\Services;

use App\Services\JobBoards\AdzunaBoard;
use App\Services\JobBoards\JobBoard;
use App\Services\JobBoards\JobQuery;
use App\Services\JobBoards\UsaJobsBoard;

class JobSearchService
{
    /**
     * @var array<JobBoard>
     */
    private array $boards;

    public function __construct(AdzunaBoard $adzuna, UsaJobsBoard $usaJobs)
    {
        $this->boards = [$adzuna, $usaJobs];
    }

    /**
     * Fan out to every configured board and merge the results.
     *
     * @return array<array<string, mixed>>
     */
    public function search(JobQuery $query): array
    {
        $listings = [];

        foreach ($this->boards as $board) {
            if (! $board->isConfigured()) {
                continue;
            }

            $listings = array_merge($listings, $board->search($query));
        }

        return $this->dedupe($listings);
    }

    /**
     * Keys of the boards that have credentials, so the UI can say which
     * sources a result set actually came from.
     *
     * @return array<int, string>
     */
    public function configuredKeys(): array
    {
        return array_values(array_map(
            fn (JobBoard $board): string => $board->key(),
            array_filter($this->boards, fn (JobBoard $board): bool => $board->isConfigured()),
        ));
    }

    /**
     * The same posting is routinely syndicated to more than one board under
     * different ids, so identity has to come from the human-readable fields.
     *
     * @param  array<array<string, mixed>>  $listings
     * @return array<array<string, mixed>>
     */
    private function dedupe(array $listings): array
    {
        $seen = [];

        foreach ($listings as $listing) {
            $key = mb_strtolower(trim($listing['company'].'|'.$listing['title'].'|'.$listing['location']));
            $seen[$key] ??= $listing;
        }

        return array_values($seen);
    }
}
