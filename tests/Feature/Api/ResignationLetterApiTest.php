<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ResignationLetterApiTest extends ApiTestCase
{
    use RefreshDatabase;

    private function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    public function test_can_list_resignation_letters(): void
    {
        $user = User::factory()->create();
        $user->resignationLetters()->createMany([
            ['name' => 'Letter A', 'template_key' => 'standard', 'body' => 'Body A'],
            ['name' => 'Letter B', 'template_key' => 'standard', 'body' => 'Body B'],
        ]);

        $this->withToken($this->token($user))
            ->getJson('/api/resignation-letters')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_can_create_resignation_letter(): void
    {
        $user = User::factory()->create();

        $this->withToken($this->token($user))
            ->postJson('/api/resignation-letters', ['name' => 'My Letter', 'template_key' => 'standard'])
            ->assertCreated()
            ->assertJsonPath('name', 'My Letter');
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/resignation-letters')->assertUnauthorized();
    }

    public function test_can_show_own_resignation_letter(): void
    {
        $user = User::factory()->create();
        $letter = $user->resignationLetters()->create([
            'name' => 'My Letter', 'template_key' => 'standard', 'body' => 'Hello',
        ]);

        $this->withToken($this->token($user))
            ->getJson("/api/resignation-letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('id', $letter->id);
    }

    public function test_cannot_show_other_users_resignation_letter(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $letter = $owner->resignationLetters()->create([
            'name' => 'Private', 'template_key' => 'standard', 'body' => 'Secret',
        ]);

        $this->withToken($this->token($other))
            ->getJson("/api/resignation-letters/{$letter->id}")
            ->assertForbidden();
    }

    public function test_can_update_resignation_letter(): void
    {
        $user = User::factory()->create();
        $letter = $user->resignationLetters()->create([
            'name' => 'Old', 'template_key' => 'standard', 'body' => 'text',
        ]);

        $this->withToken($this->token($user))
            ->putJson("/api/resignation-letters/{$letter->id}", ['name' => 'New Name'])
            ->assertOk()
            ->assertJsonPath('name', 'New Name');
    }

    public function test_cannot_update_other_users_resignation_letter(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $letter = $owner->resignationLetters()->create([
            'name' => 'Mine', 'template_key' => 'standard', 'body' => 'text',
        ]);

        $this->withToken($this->token($other))
            ->putJson("/api/resignation-letters/{$letter->id}", ['name' => 'Hijacked'])
            ->assertForbidden();
    }

    public function test_can_delete_resignation_letter(): void
    {
        $user = User::factory()->create();
        $letter = $user->resignationLetters()->create([
            'name' => 'Gone', 'template_key' => 'standard', 'body' => 'text',
        ]);

        $this->withToken($this->token($user))
            ->deleteJson("/api/resignation-letters/{$letter->id}")
            ->assertNoContent();

        $this->assertModelMissing($letter);
    }

    public function test_can_update_template_key(): void
    {
        $user = User::factory()->create();
        $letter = $user->resignationLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->putJson("/api/resignation-letters/{$letter->id}", ['template_key' => 'warm'])
            ->assertOk()
            ->assertJsonPath('template_key', 'warm');
    }

    public function test_update_rejects_resume_id_owned_by_another_user(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $othersResume = $other->resumes()->create(['name' => 'Not Yours', 'pdf_filename' => 'x.pdf']);
        $letter = $user->resignationLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->putJson("/api/resignation-letters/{$letter->id}", ['resume_id' => $othersResume->id])
            ->assertForbidden();
    }
}
