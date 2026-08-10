<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LegalPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_privacy_policy_page_is_public(): void
    {
        $this->get(route('legal.privacy'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Legal/Privacy'));
    }

    public function test_terms_of_service_page_is_public(): void
    {
        $this->get(route('legal.terms'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Legal/Terms'));
    }

    public function test_not_found_page_is_branded(): void
    {
        $this->get('/this-route-definitely-does-not-exist-p0')
            ->assertNotFound()
            ->assertSee('Page not found', false)
            ->assertSee('Resumegen', false)
            ->assertSee('/r-monogram.svg', false);
    }
}
