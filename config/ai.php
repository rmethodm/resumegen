<?php

return [
    /*
     * Default chat model used by App\Services\AiService when no model is passed.
     */
    'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),

    /*
     * Per-tier monthly AI request caps. Consumed by App\Services\UserLimits.
     * Not enforced on any route yet — foundation for a future feature.
     */
    'monthly_limits' => [
        'free' => 10,
        'starter' => 100,
        'pro' => 1000,
        'agency' => 5000,
    ],

    /*
     * Per-model pricing in cents per 1,000 tokens. Used to estimate request cost.
     * Models without an entry are billed as 0.
     */
    'pricing' => [
        'gpt-4o-mini' => ['input' => 0.015, 'output' => 0.06],
    ],
];
