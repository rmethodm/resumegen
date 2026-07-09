<?php

return [
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
     * Per-tier monthly AI request caps. Consumed by App\Services\UserLimits and
     * enforced on every AI route via UserLimits::canUseAi(). Interview coach is
     * the exception: free users get 3 sessions/month metered separately.
     */
    'monthly_limits' => [
        'free' => 0,
        'starter' => 150,
        'pro' => 500,
        'agency' => 1000,
    ],

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
