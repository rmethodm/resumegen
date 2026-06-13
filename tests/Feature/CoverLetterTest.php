<?php

namespace Tests\Feature;

use App\Models\CoverLetter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CoverLetterTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_lists_only_my_letters(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        CoverLetter::factory()->for($me)->create(['name' => 'Mine']);
        CoverLetter::factory()->for($other)->create(['name' => 'Theirs']);

        $this->actingAs($me)
            ->get(route('cover-letters.index'))
            ->assertOk()
            ->assertInertia(fn ($p) => $p->component('CoverLetter/Index')->has('letters', 1));
    }

    public function test_store_creates_letter_from_template(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('cover-letters.store'), [
                'template_key' => 'standard',
                'name' => 'My Cover Letter',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('cover_letters', [
            'user_id' => $user->id,
            'template_key' => 'standard',
            'name' => 'My Cover Letter',
        ]);
        $letter = CoverLetter::first();
        $this->assertNotEmpty($letter->body);
        $this->assertStringContainsString('Dear Hiring Manager', $letter->body);
    }

    public function test_store_rejects_unknown_template(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('cover-letters.store'), [
                'template_key' => 'bogus',
                'name' => 'X',
            ])
            ->assertSessionHasErrors('template_key');
    }

    public function test_update_persists_changes(): void
    {
        $user = User::factory()->create();
        $letter = CoverLetter::factory()->for($user)->create();

        $this->actingAs($user)
            ->put(route('cover-letters.update', $letter->id), [
                'name' => 'Renamed',
                'body' => 'Hello world',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('cover_letters', ['id' => $letter->id, 'name' => 'Renamed', 'body' => 'Hello world']);
    }

    public function test_other_user_cannot_update(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $letter = CoverLetter::factory()->for($owner)->create();

        $this->actingAs($other)
            ->put(route('cover-letters.update', $letter->id), ['name' => 'Hacked'])
            ->assertForbidden();
    }

    public function test_destroy_deletes_letter(): void
    {
        $user = User::factory()->create();
        $letter = CoverLetter::factory()->for($user)->create();

        $this->actingAs($user)
            ->delete(route('cover-letters.destroy', $letter->id))
            ->assertRedirect();

        $this->assertDatabaseMissing('cover_letters', ['id' => $letter->id]);
    }

    public function test_free_user_at_cover_letter_limit_is_blocked(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        CoverLetter::factory()->count(3)->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('cover-letters.store'), [
                'name' => 'My Letter',
                'template_key' => 'standard',
            ])
            ->assertRedirect()
            ->assertSessionHas('featureGate.feature', 'cover_letter_limit');
    }

    public function test_starter_user_can_create_up_to_five_cover_letters(): void
    {
        $user = User::factory()->starter()->create();
        CoverLetter::factory()->count(4)->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('cover-letters.store'), [
                'name' => 'My Letter',
                'template_key' => 'standard',
            ])
            ->assertRedirect()
            ->assertSessionMissing('featureGate');
    }

    public function test_starter_user_at_cover_letter_limit_is_blocked(): void
    {
        $user = User::factory()->starter()->create();
        CoverLetter::factory()->count(10)->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('cover-letters.store'), [
                'name' => 'My Letter',
                'template_key' => 'standard',
            ])
            ->assertRedirect()
            ->assertSessionHas('featureGate.feature', 'cover_letter_limit');
    }

    public function test_pro_user_has_unlimited_cover_letters(): void
    {
        $user = User::factory()->pro()->create();
        CoverLetter::factory()->count(20)->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('cover-letters.store'), [
                'name' => 'My Letter',
                'template_key' => 'standard',
            ])
            ->assertRedirect()
            ->assertSessionMissing('featureGate');
    }
}
