<?php

namespace Tests\Feature\Api;

use App\Exceptions\ModerationException;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;

class CoverLetterApiTest extends ApiTestCase
{
    use RefreshDatabase;

    private function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    private function fakeReply(string $content): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => $content]]],
                'usage' => ['prompt_tokens' => 5, 'completion_tokens' => 5, 'total_tokens' => 10],
            ]),
        ]));
    }

    public function test_can_update_template_key(): void
    {
        $user = User::factory()->create();
        $letter = $user->coverLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->putJson("/api/cover-letters/{$letter->id}", ['template_key' => 'modern'])
            ->assertOk()
            ->assertJsonPath('template_key', 'modern');
    }

    public function test_update_rejects_unknown_template_key(): void
    {
        $user = User::factory()->create();
        $letter = $user->coverLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->putJson("/api/cover-letters/{$letter->id}", ['template_key' => 'bogus'])
            ->assertStatus(422);
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

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/cover-letters')->assertUnauthorized();
    }

    public function test_can_show_own_cover_letter(): void
    {
        $user = User::factory()->create();
        $letter = $user->coverLetters()->create([
            'name' => 'My Letter', 'template_key' => 'standard', 'body' => 'Hello world',
        ]);

        $this->withToken($this->token($user))
            ->getJson("/api/cover-letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('id', $letter->id)
            ->assertJsonPath('name', 'My Letter');
    }

    public function test_cannot_show_other_users_cover_letter(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $letter = $owner->coverLetters()->create([
            'name' => 'Private', 'template_key' => 'standard', 'body' => 'Secret',
        ]);

        $this->withToken($this->token($other))
            ->getJson("/api/cover-letters/{$letter->id}")
            ->assertForbidden();
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

    public function test_generate_returns_body_and_remaining(): void
    {
        $this->fakeReply('Dear Hiring Manager, I am excited to apply.');
        $user = User::factory()->pro()->create();
        $letter = $user->coverLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->postJson("/api/cover-letters/{$letter->id}/generate", ['tone' => 'formal'])
            ->assertOk()
            ->assertJsonStructure(['body', 'remaining'])
            ->assertJsonPath('body', 'Dear Hiring Manager, I am excited to apply.');

        $this->assertDatabaseHas('cover_letters', [
            'id' => $letter->id,
            'body' => 'Dear Hiring Manager, I am excited to apply.',
        ]);
    }

    public function test_generate_other_users_letter_forbidden(): void
    {
        $owner = User::factory()->pro()->create();
        $other = User::factory()->pro()->create();
        $letter = $owner->coverLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($other))
            ->postJson("/api/cover-letters/{$letter->id}/generate", ['tone' => 'formal'])
            ->assertForbidden();
    }

    public function test_generate_quota_exhausted_returns_402(): void
    {
        config()->set('ai.monthly_limits.pro', 0);
        $user = User::factory()->pro()->create();
        $letter = $user->coverLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->postJson("/api/cover-letters/{$letter->id}/generate", ['tone' => 'formal'])
            ->assertStatus(402)
            ->assertJsonStructure(['error', 'can_upgrade', 'next_tier', 'limit', 'used', 'resets_at']);
    }

    public function test_generate_moderation_rejection_returns_422(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => true]]]),
        ]));
        $user = User::factory()->pro()->create();
        $letter = $user->coverLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->postJson("/api/cover-letters/{$letter->id}/generate", ['tone' => 'formal'])
            ->assertStatus(422)
            ->assertJsonPath('error', ModerationException::USER_MESSAGE);
    }

    public function test_generate_validates_tone(): void
    {
        $user = User::factory()->pro()->create();
        $letter = $user->coverLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->postJson("/api/cover-letters/{$letter->id}/generate", ['tone' => 'sarcastic'])
            ->assertStatus(422);
    }
}
