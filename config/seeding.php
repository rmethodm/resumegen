<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Local Seed / Test Account
    |--------------------------------------------------------------------------
    |
    | The account the development seeders populate and the local-only /reset
    | route returns to a fresh state. Set these in .env to use your own login.
    |
    */

    'user_email' => env('SEED_USER_EMAIL', 'test@example.com'),

    'user_password' => env('SEED_USER_PASSWORD', 'password'),

];
