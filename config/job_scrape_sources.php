<?php

return [

    // Company board slugs to pull from Greenhouse/Lever's public JSON
    // endpoints. Empty by default — nothing is fetched until companies are
    // added here (see App\Services\JobImport\JobScrapePool).
    'greenhouse' => [
        // 'stripe',
    ],

    'lever' => [
        // 'netflix',
    ],

    // Individual career-page URLs to scrape for JobPosting JSON-LD.
    'career_pages' => [
        // 'https://example.com/careers',
    ],

    // Minimum hours between fetches of the same source, to avoid hammering
    // any one site on every scheduler tick.
    'min_interval_hours' => env('JOB_SCRAPE_MIN_INTERVAL_HOURS', 6),

];
