<?php

namespace Tests\Feature\Auth;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AuthRouteNamesTest extends TestCase
{
    /**
     * Every route name referenced via route(...) inside resources/js/Pages/Auth/*.tsx,
     * derived by grepping those files. This is a tripwire: if a future dependency
     * bump or refactor (e.g. Fortify vs. Breeze route naming) renames one of these
     * routes, this test fails immediately instead of silently breaking a page that
     * nothing else exercises.
     *
     * @var array<int, string>
     */
    private const ROUTE_NAMES = [
        'login',
        'password.request',
        'register',
        'password.confirm.store',
        'password.email',
        'password.update',
        'verification.send',
        'logout',
        'two-factor.challenge.store',
        'two-factor.challenge.email',
    ];

    public function test_all_route_names_used_by_auth_pages_resolve(): void
    {
        foreach (self::ROUTE_NAMES as $name) {
            $this->assertTrue(Route::has($name), "Route [{$name}] used by an Auth page no longer exists.");
        }
    }
}
