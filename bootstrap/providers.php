<?php

use App\Providers\AppServiceProvider;
use App\Providers\FortifyServiceProvider;
use Laravel\Fortify\FortifyServiceProvider as LaravelFortifyServiceProvider;

return [
    AppServiceProvider::class,
    LaravelFortifyServiceProvider::class,
    FortifyServiceProvider::class,
];
