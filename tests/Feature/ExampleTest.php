<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        // First-time guests are redirected to the builder subdomain; the
        // returning cookie keeps this a plain 200 smoke test.
        $response = $this->withCookie('rg_returning', '1')->get('/');

        $response->assertStatus(200);
    }
}
