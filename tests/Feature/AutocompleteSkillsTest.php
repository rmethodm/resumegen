<?php

namespace Tests\Feature;

use App\Models\JobSkill;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AutocompleteSkillsTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_returns_prefix_matches_ordered_and_capped(): void
    {
        $user = User::factory()->create();
        foreach (['Python', 'PyTorch', 'PostgreSQL', 'PHP'] as $name) {
            JobSkill::create(['category' => 'Programming', 'name' => $name]);
        }

        $response = $this->actingAs($user)->getJson('/autocomplete/job-skills?q=Py');

        $response->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.name', 'PyTorch') // alphabetical: PyTorch before Python
            ->assertJsonPath('1.name', 'Python');
    }

    public function test_search_falls_back_to_substring_when_fewer_than_three_prefix_hits(): void
    {
        $user = User::factory()->create();
        JobSkill::create(['category' => 'Programming', 'name' => 'JavaScript']);
        JobSkill::create(['category' => 'Programming', 'name' => 'TypeScript']);
        JobSkill::create(['category' => 'Programming', 'name' => 'CoffeeScript']);

        // Prefix "Script" matches 0; substring fallback matches all 3.
        $response = $this->actingAs($user)->getJson('/autocomplete/job-skills?q=Script');

        $response->assertOk()->assertJsonCount(3);
    }

    public function test_search_returns_empty_for_short_query(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/autocomplete/job-skills?q=P')
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_store_creates_new_skill_under_user_added_title_cased(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/autocomplete/job-skills', ['name' => 'react native']);

        $response->assertOk()->assertJsonFragment(['name' => 'React Native']);
        $this->assertDatabaseHas('job_skills', ['name' => 'React Native', 'category' => 'User Added']);
    }

    public function test_store_reuses_existing_curated_skill_by_name(): void
    {
        $user = User::factory()->create();
        JobSkill::create(['category' => 'Programming', 'name' => 'Rust']);

        $this->actingAs($user)->postJson('/autocomplete/job-skills', ['name' => 'Rust'])->assertOk();

        // No duplicate row under "User Added"; the curated row is reused.
        $this->assertDatabaseCount('job_skills', 1);
        $this->assertDatabaseHas('job_skills', ['name' => 'Rust', 'category' => 'Programming']);
    }

    public function test_search_requires_authentication(): void
    {
        $this->getJson('/autocomplete/job-skills?q=Python')->assertUnauthorized();
    }

    public function test_store_requires_authentication(): void
    {
        $this->postJson('/autocomplete/job-skills', ['name' => 'Python'])->assertUnauthorized();
    }

    public function test_search_filters_to_bucket_categories_when_category_given(): void
    {
        $user = User::factory()->create();
        // 'Web & Mobile' bucket = Web Frontend / Web Backend / Mobile Development
        JobSkill::create(['category' => 'Web Frontend', 'name' => 'Reactive Forms']);
        JobSkill::create(['category' => 'Healthcare & Clinical', 'name' => 'Reactive Care']);

        $response = $this->actingAs($user)
            ->getJson('/autocomplete/job-skills?q=Rea&category='.urlencode('Web & Mobile'));

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => 'Reactive Forms']);
    }

    public function test_unknown_category_falls_back_to_flat_search(): void
    {
        $user = User::factory()->create();
        JobSkill::create(['category' => 'Web Frontend', 'name' => 'Reactive Forms']);
        JobSkill::create(['category' => 'Healthcare & Clinical', 'name' => 'Reactive Care']);

        $response = $this->actingAs($user)
            ->getJson('/autocomplete/job-skills?q=Rea&category='.urlencode('Not A Bucket'));

        // Unknown bucket → no filter → both match.
        $response->assertOk()->assertJsonCount(2);
    }
}
