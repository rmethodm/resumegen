<?php

namespace Tests\Feature;

use App\Models\JobRole;
use App\Models\JobTitle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AutocompleteTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_roles_returns_matching_suggestions(): void
    {
        $user = User::factory()->create();
        JobRole::create(['title' => 'Software Engineer']);
        JobRole::create(['title' => 'Software Architect']);
        JobRole::create(['title' => 'Product Manager']);

        $response = $this->actingAs($user)
            ->getJson('/autocomplete/job-roles?q=Software');

        $response->assertOk()
            ->assertJsonCount(2)
            ->assertJsonFragment(['title' => 'Software Engineer'])
            ->assertJsonFragment(['title' => 'Software Architect']);
    }

    public function test_search_roles_returns_empty_for_short_query(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->getJson('/autocomplete/job-roles?q=S');

        $response->assertOk()->assertJsonCount(0);
    }

    public function test_store_role_creates_new_title_cased_entry(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/autocomplete/job-roles', ['title' => 'senior data analyst']);

        $response->assertOk()
            ->assertJsonFragment(['title' => 'Senior Data Analyst']);

        $this->assertDatabaseHas('job_roles', ['title' => 'Senior Data Analyst']);
    }

    public function test_store_role_is_idempotent(): void
    {
        $user = User::factory()->create();
        JobRole::create(['title' => 'Product Manager']);

        $this->actingAs($user)->postJson('/autocomplete/job-roles', ['title' => 'Product Manager']);
        $this->actingAs($user)->postJson('/autocomplete/job-roles', ['title' => 'Product Manager']);

        $this->assertDatabaseCount('job_roles', 1);
    }

    public function test_search_titles_returns_matching_suggestions(): void
    {
        $user = User::factory()->create();
        JobTitle::create(['title' => 'Senior Software Engineer']);
        JobTitle::create(['title' => 'Staff Software Engineer']);
        JobTitle::create(['title' => 'Product Manager']);

        $response = $this->actingAs($user)
            ->getJson('/autocomplete/job-titles?q=Senior');

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['title' => 'Senior Software Engineer']);
    }

    public function test_store_title_creates_new_entry(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/autocomplete/job-titles', ['title' => 'lead machine learning engineer']);

        $response->assertOk()
            ->assertJsonFragment(['title' => 'Lead Machine Learning Engineer']);

        $this->assertDatabaseHas('job_titles', ['title' => 'Lead Machine Learning Engineer']);
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/autocomplete/job-roles?q=Engineer')->assertUnauthorized();
        $this->postJson('/autocomplete/job-roles', ['title' => 'Engineer'])->assertUnauthorized();
        $this->getJson('/autocomplete/job-titles?q=Engineer')->assertUnauthorized();
        $this->postJson('/autocomplete/job-titles', ['title' => 'Engineer'])->assertUnauthorized();
    }

    public function test_store_rejects_blank_title(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/autocomplete/job-roles', ['title' => ''])
            ->assertUnprocessable();
    }

    public function test_store_rejects_title_over_150_chars(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/autocomplete/job-roles', ['title' => str_repeat('a', 151)])
            ->assertUnprocessable();
    }
}
