<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CoverLetterApiTest extends ApiTestCase
{
    use RefreshDatabase;

    private function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    public function test_can_list_cover_letters(): void
    {
        $user = User::factory()->create();
        $user->coverLetters()->createMany([
            ['name' => 'Letter A', 'template_key' => 'standard', 'body' => 'Body A'],
            ['name' => 'Letter B', 'template_key' => 'standard', 'body' => 'Body B'],
        ]);

        $this->withToken($this->token($user))
            ->getJson('/api/cover-letters')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_can_create_cover_letter(): void
    {
        $user = User::factory()->create();

        $this->withToken($this->token($user))
            ->postJson('/api/cover-letters', [
                'name' => 'My Letter',
                'template_key' => 'standard',
            ])
            ->assertCreated()
            ->assertJsonPath('name', 'My Letter');
    }

    public function test_can_update_cover_letter(): void
    {
        $user = User::factory()->create();
        $letter = $user->coverLetters()->create([
            'name' => 'Old', 'template_key' => 'standard', 'body' => 'text',
        ]);

        $this->withToken($this->token($user))
            ->putJson("/api/cover-letters/{$letter->id}", ['name' => 'New Name'])
            ->assertOk()
            ->assertJsonPath('name', 'New Name');
    }

    public function test_can_delete_cover_letter(): void
    {
        $user = User::factory()->create();
        $letter = $user->coverLetters()->create([
            'name' => 'Gone', 'template_key' => 'standard', 'body' => 'text',
        ]);

        $this->withToken($this->token($user))
            ->deleteJson("/api/cover-letters/{$letter->id}")
            ->assertNoContent();

        $this->assertModelMissing($letter);
    }

    public function test_cannot_update_other_users_cover_letter(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $letter = $owner->coverLetters()->create([
            'name' => 'Mine', 'template_key' => 'standard', 'body' => 'text',
        ]);

        $this->withToken($this->token($other))
            ->putJson("/api/cover-letters/{$letter->id}", ['name' => 'Hijacked'])
            ->assertForbidden();
    }
}
