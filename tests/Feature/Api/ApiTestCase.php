<?php

namespace Tests\Feature\Api;

use Tests\TestCase;

/**
 * Base test case for API (Sanctum token-based) tests.
 *
 * Resets the Auth guard cache before each HTTP request so that token
 * revocation is visible in subsequent requests within the same test.
 * Sanctum's RequestGuard caches the resolved user in $this->user, and
 * Laravel does not clear that cache when setRequest() is called between
 * test requests — so without this, a deleted token still authenticates.
 */
abstract class ApiTestCase extends TestCase
{
    public function call($method, $uri, $parameters = [], $cookies = [], $files = [], $server = [], $content = null)
    {
        $this->app['auth']->forgetGuards();

        return parent::call($method, $uri, $parameters, $cookies, $files, $server, $content);
    }
}
