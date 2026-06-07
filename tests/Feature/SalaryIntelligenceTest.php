<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalaryIntelligenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_exact_match_returns_range(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson(route('jobs.salary', ['role' => 'software engineer']))
            ->assertOk()
            ->assertJsonFragment(['match' => 'exact', 'min' => 95000, 'max' => 160000]);
    }

    public function test_partial_match_returns_range(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson(route('jobs.salary', ['role' => 'senior data scientist']))
            ->assertOk()
            ->assertJsonFragment(['match' => 'partial']);
    }

    public function test_unknown_role_returns_nulls(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson(route('jobs.salary', ['role' => 'blockchain sandwich artist']))
            ->assertOk()
            ->assertJsonFragment(['match' => 'none', 'min' => null, 'max' => null]);
    }

    public function test_missing_role_returns_validation_error(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson(route('jobs.salary'))
            ->assertStatus(422);
    }

    public function test_unauthenticated_returns_redirect(): void
    {
        $this->getJson(route('jobs.salary', ['role' => 'engineer']))
            ->assertStatus(401);
    }
}
