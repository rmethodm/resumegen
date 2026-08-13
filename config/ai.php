<?php

/**
 * Optional AI features (bullet rewrite, summary, job match).
 * Disabled unless AI_ENABLED=true and OPENAI_API_KEY is set.
 * See docs/ai-reintroduction-map.md and docs/ai-provider-comparison-2026-08.md.
 */
return [
    'enabled' => (bool) env('AI_ENABLED', false),

    /*
     * Which vendor App\Services\AiService talks to: 'openai' or 'anthropic'.
     * App-wide, not per-user. Moderation always runs through OpenAI's free
     * moderations endpoint regardless, so OPENAI_API_KEY is required either way.
     */
    'provider' => env('AI_PROVIDER', 'openai'),

    /*
     * Which vendor App\Services\AiService talks to: 'openai' or 'anthropic'.
     * App-wide, not per-user. Moderation always runs through OpenAI's free
     * moderations endpoint regardless, so OPENAI_API_KEY is required either way.
     */
    'provider' => env('AI_PROVIDER', 'openai'),

    /*
     * Default chat model used by App\Services\AiService when no model is passed.
     */
    'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),

    /*
     * Anthropic credentials and default model, used when provider is 'anthropic'.
     */
    'anthropic_key' => env('ANTHROPIC_API_KEY'),
    'anthropic_model' => env('ANTHROPIC_MODEL', 'claude-sonnet-5'),

    /*
     * Org-level Admin API key (distinct from OPENAI_API_KEY) used only by
     * App\Services\OpenAiUsageService to read org Costs/Usage. Optional —
     * when absent, the admin dashboard degrades gracefully.
     */
    'admin_key' => env('OPENAI_ADMIN_KEY'),

    /*
     * Hard cap on completion tokens per chat call. 1000 fits the longest
     * multi-line bullet rewrites (input cap is 8000 chars).
     */
    'max_completion_tokens' => 1000,

    /*
     * Flat monthly AI request cap applied to every account. This is a cost control,
     * not a plan gate — OpenAI spend scales with usage, so an unbounded quota would
     * let one account run up an arbitrary bill. Override per-user via
     * users.ai_limit_override; kill a specific account with users.ai_blocked.
     */
    'monthly_limit' => (int) env('AI_MONTHLY_LIMIT', 150),

    /*
     * Per-model pricing in cents per 1,000 tokens. Used to estimate request cost.
     * Models without an entry are billed as 0.
     */
    'pricing' => [
        'gpt-4o-mini' => ['input' => 0.015, 'output' => 0.06],
        'claude-sonnet-5' => ['input' => 0.3, 'output' => 1.5],
        'claude-haiku-4-5-20251001' => ['input' => 0.1, 'output' => 0.5],
    ],

    /** Soft free-tier monthly caps per user (Cache counter, not billing). */
    'quotas' => [
        'bullet_rewrite' => (int) env('AI_QUOTA_BULLET_REWRITE', 5),
        'summary' => (int) env('AI_QUOTA_SUMMARY', 2),
        'job_match' => (int) env('AI_QUOTA_JOB_MATCH', 5),
    ],
];
