<?php

namespace Tests\Feature\Api;

use App\Models\Resume;
use App\Models\ResumeGroup;
use App\Models\User;
use App\Support\MobileApiToken;
use Illuminate\Foundation\Testing\RefreshDatabase;

class MobileResumeApiTest extends ApiTestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken(
            MobileApiToken::TOKEN_NAME,
            [MobileApiToken::TOKEN_ABILITY]
        )->plainTextToken;
    }

    public function test_index_requires_token(): void
    {
        $this->getJson('/api/resumes')->assertUnauthorized();
    }

    public function test_token_without_mobile_ability_is_forbidden(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('other', ['something-else'])->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/resumes')
            ->assertForbidden();
    }

    public function test_disabled_user_is_rejected(): void
    {
        $user = User::factory()->create(['disabled_at' => now()]);

        $this->withToken($this->tokenFor($user))
            ->getJson('/api/resumes')
            ->assertForbidden();
    }

    public function test_index_lists_only_the_users_resumes(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $mine = Resume::factory()->for($user)->create(['title' => 'Mine']);
        Resume::factory()->for($other)->create(['title' => 'Not mine']);

        $this->withToken($this->tokenFor($user))
            ->getJson('/api/resumes')
            ->assertOk()
            ->assertJsonCount(1, 'resumes')
            ->assertJsonPath('resumes.0.id', $mine->id);
    }

    public function test_show_returns_the_full_document(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'title' => 'Product Design',
            'full_name' => 'Maya Chen',
        ]);

        $this->withToken($this->tokenFor($user))
            ->getJson("/api/resumes/{$resume->id}")
            ->assertOk()
            ->assertJsonPath('title', 'Product Design')
            ->assertJsonPath('full_name', 'Maya Chen');
    }

    public function test_show_hides_other_users_resumes(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();

        $this->withToken($this->tokenFor($intruder))
            ->getJson("/api/resumes/{$resume->id}")
            ->assertNotFound();
    }

    public function test_store_creates_a_resume(): void
    {
        $user = User::factory()->create();

        $this->withToken($this->tokenFor($user))
            ->postJson('/api/resumes')
            ->assertCreated()
            ->assertJsonPath('title', 'Untitled resume');

        $this->assertSame(1, $user->resumes()->count());
    }

    public function test_update_saves_the_document(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['title' => 'Old title']);

        $this->withToken($this->tokenFor($user))
            ->putJson("/api/resumes/{$resume->id}", ['title' => 'New title'])
            ->assertOk()
            ->assertJsonPath('title', 'New title');

        $this->assertSame('New title', $resume->fresh()->title);
    }

    public function test_update_rejects_another_users_resume(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();

        $this->withToken($this->tokenFor($intruder))
            ->putJson("/api/resumes/{$resume->id}", ['title' => 'Hijacked'])
            ->assertNotFound();
    }

    public function test_destroy_deletes_a_non_base_version(): void
    {
        $user = User::factory()->create();
        $group = ResumeGroup::factory()->for($user)->create();
        $base = Resume::factory()->for($user)->create(['group_id' => $group->id]);
        $sibling = Resume::factory()->for($user)->create(['group_id' => $group->id]);

        $this->withToken($this->tokenFor($user))
            ->deleteJson("/api/resumes/{$sibling->id}")
            ->assertNoContent();

        $this->assertModelMissing($sibling);
        $this->assertModelExists($base);
    }

    public function test_destroy_refuses_to_delete_the_base_version(): void
    {
        $user = User::factory()->create();
        $group = ResumeGroup::factory()->for($user)->create();
        $base = Resume::factory()->for($user)->create(['group_id' => $group->id]);

        $this->withToken($this->tokenFor($user))
            ->deleteJson("/api/resumes/{$base->id}")
            ->assertForbidden();

        $this->assertModelExists($base);
    }
}
