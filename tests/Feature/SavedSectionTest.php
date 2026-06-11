<?php

namespace Tests\Feature;

use App\Models\SavedSection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SavedSectionTest extends TestCase
{
    use RefreshDatabase;

    private array $validFields = [
        ['id' => 'title', 'type' => 'text', 'label' => 'Title'],
        ['id' => 'body', 'type' => 'textarea', 'label' => 'Description'],
    ];

    public function test_authenticated_user_can_store_a_saved_section(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson(route('saved-sections.store'), [
            'name'   => 'My Work History',
            'type'   => 'experience',
            'fields' => $this->validFields,
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'My Work History', 'type' => 'experience']);

        $this->assertDatabaseHas('saved_sections', [
            'user_id' => $user->id,
            'name'    => 'My Work History',
        ]);
    }

    public function test_index_returns_only_the_authenticated_users_sections(): void
    {
        $user  = User::factory()->create();
        $other = User::factory()->create();

        SavedSection::factory()->create(['user_id' => $user->id, 'name' => 'Mine']);
        SavedSection::factory()->create(['user_id' => $other->id, 'name' => 'Theirs']);

        $response = $this->actingAs($user)->getJson(route('saved-sections.index'));

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => 'Mine'])
            ->assertJsonMissing(['name' => 'Theirs']);
    }

    public function test_owner_can_destroy_their_saved_section(): void
    {
        $user    = User::factory()->create();
        $section = SavedSection::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->deleteJson(route('saved-sections.destroy', $section));

        $response->assertStatus(204);
        $this->assertDatabaseMissing('saved_sections', ['id' => $section->id]);
    }

    public function test_user_cannot_destroy_another_users_saved_section(): void
    {
        $owner   = User::factory()->create();
        $other   = User::factory()->create();
        $section = SavedSection::factory()->create(['user_id' => $owner->id]);

        $response = $this->actingAs($other)->deleteJson(route('saved-sections.destroy', $section));

        $response->assertStatus(403);
        $this->assertDatabaseHas('saved_sections', ['id' => $section->id]);
    }
}
