<?php

return [
    /*
     * Job board sources. A source with no credentials is skipped rather than
     * erroring — search degrades to whatever is configured, never to a 500.
     */
    'adzuna' => [
        'app_id' => env('ADZUNA_APP_ID'),
        'app_key' => env('ADZUNA_APP_KEY'),
        'country' => env('ADZUNA_COUNTRY', 'us'),
    ],

    'usajobs' => [
        'key' => env('USAJOBS_KEY'),
        'email' => env('USAJOBS_EMAIL'),
    ],

    /*
     * Search radius in miles per scope. 'national' drops the location filter
     * entirely, so it has no radius.
     */
    'scope_radius_miles' => [
        'local' => 25,
        'state' => 150,
    ],

    /*
     * Results requested per board per search. Two boards at 25 gives a page
     * that fits one AI ranking call comfortably.
     */
    'results_per_board' => 25,
];
