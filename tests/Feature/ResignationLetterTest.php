<?php

namespace Tests\Feature;

use App\Models\ResignationLetter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class ResignationLetterTest extends TestCase
{
    use RefreshDatabase;

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

    private function fakeServiceFailure(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            new \Exception('Simulated OpenAI outage'),
        ]));
    }

    public function test_index_lists_only_my_letters(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        ResignationLetter::factory()->for($me)->create(['name' => 'Mine']);
        ResignationLetter::factory()->for($other)->create(['name' => 'Theirs']);

        $this->actingAs($me)
            ->get(route('resignation-letters.index'))
            ->assertOk()
            ->assertInertia(fn ($p) => $p->component('ResignationLetter/Index')->has('letters', 1));
    }

    public function test_store_creates_letter_from_template(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('resignation-letters.store'), [
                'template_key' => 'standard',
                'name' => 'My Resignation Letter',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('resignation_letters', [
            'user_id' => $user->id,
            'template_key' => 'standard',
            'name' => 'My Resignation Letter',
        ]);
        $letter = ResignationLetter::first();
        $this->assertNotEmpty($letter->body);
        $this->assertStringContainsString("Dear [Manager's Name]", $letter->body);
    }

    public function test_store_rejects_unknown_template(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('resignation-letters.store'), [
                'template_key' => 'bogus',
                'name' => 'X',
            ])
            ->assertSessionHasErrors('template_key');
    }

    public function test_update_persists_changes(): void
    {
        $user = User::factory()->create();
        $letter = ResignationLetter::factory()->for($user)->create();

        $this->actingAs($user)
            ->put(route('resignation-letters.update', $letter->id), [
                'name' => 'Renamed',
                'body' => 'Hello world',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('resignation_letters', ['id' => $letter->id, 'name' => 'Renamed', 'body' => 'Hello world']);
    }

    public function test_other_user_cannot_update(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $letter = ResignationLetter::factory()->for($owner)->create();

        $this->actingAs($other)
            ->put(route('resignation-letters.update', $letter->id), ['name' => 'Hacked'])
            ->assertForbidden();
    }

    public function test_destroy_deletes_letter(): void
    {
        $user = User::factory()->create();
        $letter = ResignationLetter::factory()->for($user)->create();

        $this->actingAs($user)
            ->delete(route('resignation-letters.destroy', $letter->id))
            ->assertRedirect();

        $this->assertDatabaseMissing('resignation_letters', ['id' => $letter->id]);
    }

    public function test_free_user_at_resignation_letter_limit_is_blocked(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        ResignationLetter::factory()->count(1)->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('resignation-letters.store'), [
                'name' => 'My Letter',
                'template_key' => 'standard',
            ])
            ->assertRedirect()
            ->assertSessionHas('featureGate.feature', 'resignation_letter_limit');
    }

    public function test_starter_user_at_resignation_letter_limit_is_blocked(): void
    {
        $user = User::factory()->starter()->create();
        ResignationLetter::factory()->count(10)->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('resignation-letters.store'), [
                'name' => 'My Letter',
                'template_key' => 'standard',
            ])
            ->assertRedirect()
            ->assertSessionHas('featureGate.feature', 'resignation_letter_limit');
    }

    public function test_pro_user_has_unlimited_resignation_letters(): void
    {
        $user = User::factory()->pro()->create();
        ResignationLetter::factory()->count(20)->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('resignation-letters.store'), [
                'name' => 'My Letter',
                'template_key' => 'standard',
            ])
            ->assertRedirect()
            ->assertSessionMissing('featureGate');
    }
}
