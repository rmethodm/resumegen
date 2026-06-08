<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'anthropic' => [
        'key' => env('ANTHROPIC_API_KEY'),
        'model' => env('ANTHROPIC_MODEL', 'claude-sonnet-4-6'),
    ],

    'openai' => [
        'key' => env('OPENAI_API_KEY'),
        'ats_model' => env('OPENAI_ATS_MODEL', 'gpt-4o-mini'),
        'suggest_model' => env('OPENAI_SUGGEST_MODEL', 'gpt-4o'),
    ],

    'stripe' => [
        'starter_monthly_price_id' => env('STRIPE_STARTER_MONTHLY_PRICE_ID'),
        'starter_yearly_price_id' => env('STRIPE_STARTER_YEARLY_PRICE_ID'),
        'pro_monthly_price_id' => env('STRIPE_PRO_MONTHLY_PRICE_ID'),
        'pro_yearly_price_id' => env('STRIPE_PRO_YEARLY_PRICE_ID'),
        'agency_monthly_price_id' => env('STRIPE_AGENCY_MONTHLY_PRICE_ID'),
        'agency_yearly_price_id' => env('STRIPE_AGENCY_YEARLY_PRICE_ID'),
    ],

];
