<?php

use Laravel\Fortify\Features;

return [

    'guard' => 'web',

    'passwords' => 'users',

    'username' => 'email',

    'email' => 'email',

    'lowercase_usernames' => true,

    'home' => '/dashboard',

    'prefix' => '',

    'domain' => null,

    'middleware' => ['web'],

    'views' => true,

    // Fortify's default paths for these three routes differ from the paths the
    // pre-existing Breeze routes (and this app's tests) use. Override them here
    // rather than the defaults, so URLs are unchanged for existing users/links.
    'paths' => [
        'verification' => [
            'notice' => 'verify-email',
            'verify' => 'verify-email/{id}/{hash}',
        ],
        'password' => [
            'confirm' => 'confirm-password',
        ],
    ],

    'features' => [
        Features::registration(),
        Features::resetPasswords(),
        Features::emailVerification(),
    ],

];
