<?php

/**
 * Optional AI features (bullet rewrite, summary, job match).
 * Disabled unless AI_ENABLED=true and OPENAI_API_KEY is set.
 * See docs/ai-reintroduction-map.md and docs/ai-provider-comparison-2026-08.md.
 */
return [
    'enabled' => (bool) env('AI_ENABLED', false),

    'provider' => env('AI_PROVIDER', 'openai'),

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'base_url' => rtrim((string) env('OPENAI_BASE_URL', 'https://api.openai.com/v1'), '/'),
        'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
        'timeout' => (int) env('OPENAI_TIMEOUT', 30),
    ],

    /** Soft free-tier monthly caps per user (Cache counter, not billing). */
    'quotas' => [
        'bullet_rewrite' => (int) env('AI_QUOTA_BULLET_REWRITE', 5),
        'summary' => (int) env('AI_QUOTA_SUMMARY', 2),
        'job_match' => (int) env('AI_QUOTA_JOB_MATCH', 5),
    ],
];
