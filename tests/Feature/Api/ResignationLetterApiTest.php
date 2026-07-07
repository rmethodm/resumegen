<?php

namespace Tests\Feature\Api;

use App\Exceptions\ModerationException;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;

class ResignationLetterApiTest extends ApiTestCase
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

    public function test_generate_returns_body_and_remaining(): void
    {
        $this->fakeReply('I am writing to inform you of my resignation.');
        $user = User::factory()->pro()->create();
        $letter = $user->resignationLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->postJson("/api/resignation-letters/{$letter->id}/generate", [
                'tone' => 'formal',
                'last_day' => now()->addWeeks(2)->format('Y-m-d'),
            ])
            ->assertOk()
            ->assertJsonStructure(['body', 'remaining'])
            ->assertJsonPath('body', 'I am writing to inform you of my resignation.');
    }

    public function test_generate_other_users_letter_forbidden(): void
    {
        $owner = User::factory()->pro()->create();
        $other = User::factory()->pro()->create();
        $letter = $owner->resignationLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($other))
            ->postJson("/api/resignation-letters/{$letter->id}/generate", [
                'tone' => 'formal', 'last_day' => now()->addWeeks(2)->format('Y-m-d'),
            ])
            ->assertForbidden();
    }

    public function test_generate_quota_exhausted_returns_402(): void
    {
        config()->set('ai.monthly_limits.pro', 0);
        $user = User::factory()->pro()->create();
        $letter = $user->resignationLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->postJson("/api/resignation-letters/{$letter->id}/generate", [
                'tone' => 'formal', 'last_day' => now()->addWeeks(2)->format('Y-m-d'),
            ])
            ->assertStatus(402);
    }

    public function test_generate_moderation_rejection_returns_422(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => true]]]),
        ]));
        $user = User::factory()->pro()->create();
        $letter = $user->resignationLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->postJson("/api/resignation-letters/{$letter->id}/generate", [
                'tone' => 'formal', 'last_day' => now()->addWeeks(2)->format('Y-m-d'),
            ])
            ->assertStatus(422)
            ->assertJsonPath('error', ModerationException::USER_MESSAGE);
    }
}
