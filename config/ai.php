<?php

return [
    /*
     * Master switch for every AI-backed feature. When false, AI routes 404 and
     * all AI affordances disappear from the UI; the code stays in place so the
     * features can be turned back on by flipping AI_ENABLED.
     */
    'enabled' => env('AI_ENABLED', true),

    /*
     * Default chat model used by App\Services\AiService when no model is passed.
     */
    'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),

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
    ],

    /*
     * Daily spend threshold in cents. If the previous day's AI cost exceeds this,
     * the ai:cost-alert command emails the admin address. Default $5.00.
     */
    'daily_alert_threshold_cents' => env('AI_DAILY_ALERT_CENTS', 500),
];
