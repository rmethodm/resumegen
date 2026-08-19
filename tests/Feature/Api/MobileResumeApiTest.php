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

    public function test_store_with_client_uuid_is_idempotent(): void
    {
        $user = User::factory()->create();
        $uuid = '3f2b8c1e-6a54-4b7d-9c0e-1a2b3c4d5e6f';

        $first = $this->withToken($this->tokenFor($user))
            ->postJson('/api/resumes', ['client_uuid' => $uuid])
            ->assertCreated();

        $this->withToken($this->tokenFor($user))
            ->postJson('/api/resumes', ['client_uuid' => $uuid])
            ->assertOk()
            ->assertJsonPath('id', $first->json('id'));

        $this->assertSame(1, $user->resumes()->count());
    }

    /**
     * Two offline retries can race past the existence check together; the
     * loser of the unique index must still get the winner's resume back,
     * not a 500 — that retry is the whole point of client_uuid.
     */
    public function test_store_client_uuid_race_returns_the_winner_not_a_500(): void
    {
        $user = User::factory()->create();
        $uuid = '9d4e8f2a-1b3c-4d5e-8f9a-0b1c2d3e4f5a';

        // Simulate the concurrent winner: insert the same (user, client_uuid)
        // after the controller's existence check but before its create().
        $winner = null;
        Resume::creating(function () use (&$winner, $user, $uuid): void {
            if ($winner === null) {
                $winner = 'pending';
                $winner = Resume::factory()->for($user)->create(['client_uuid' => $uuid]);
            }
        });

        $this->withToken($this->tokenFor($user))
            ->postJson('/api/resumes', ['client_uuid' => $uuid])
            ->assertOk()
            ->assertJsonPath('id', $winner->id);

        $this->assertSame(1, $user->resumes()->count());
    }

    public function test_update_with_stale_base_updated_at_returns_conflict(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['title' => 'Server version']);

        $this->withToken($this->tokenFor($user))
            ->putJson("/api/resumes/{$resume->id}", [
                'title' => 'Stale edit',
                'base_updated_at' => $resume->updated_at->copy()->subMinutes(5)->toIso8601String(),
            ])
            ->assertStatus(409)
            ->assertJsonPath('title', 'Server version');

        $this->assertSame('Server version', $resume->fresh()->title);
    }

    public function test_update_with_current_base_updated_at_saves(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['title' => 'Before']);

        $this->withToken($this->tokenFor($user))
            ->putJson("/api/resumes/{$resume->id}", [
                'title' => 'After',
                'base_updated_at' => $resume->updated_at->toIso8601String(),
            ])
            ->assertOk()
            ->assertJsonPath('title', 'After');
    }

    public function test_index_since_returns_changes_and_deletions(): void
    {
        $user = User::factory()->create();
        $old = Resume::factory()->for($user)->create(['title' => 'Old']);
        $victim = Resume::factory()->for($user)->create(['title' => 'Victim']);
        $cutoff = now()->addMinute();

        $this->travel(5)->minutes();

        $changed = Resume::factory()->for($user)->create(['title' => 'New']);
        $victimId = $victim->id;
        $victim->delete();

        $response = $this->withToken($this->tokenFor($user))
            ->getJson('/api/resumes?since='.urlencode($cutoff->toIso8601String()))
            ->assertOk();

        $ids = array_column($response->json('resumes'), 'id');
        $this->assertContains($changed->id, $ids);
        $this->assertNotContains($old->id, $ids);
        $this->assertContains($victimId, $response->json('deleted'));
    }

    /**
     * A child-only edit (one bullet, no column change) must still bump
     * updated_at — otherwise the ?since= incremental pull never surfaces it
     * and other devices keep the old content forever.
     */
    public function test_child_only_edit_bumps_updated_at_and_appears_in_since_pull(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['title' => 'Same title']);
        $before = $resume->updated_at;
        $cutoff = now()->addMinute();

        $this->travel(5)->minutes();

        $this->withToken($this->tokenFor($user))
            ->putJson("/api/resumes/{$resume->id}", [
                'title' => 'Same title',
                'experiences' => [
                    ['title' => 'Engineer', 'company' => 'Acme', 'bullets' => ['Shipped the thing']],
                ],
            ])
            ->assertOk();

        $this->assertTrue($resume->fresh()->updated_at->gt($before));

        $ids = array_column(
            $this->withToken($this->tokenFor($user))
                ->getJson('/api/resumes?since='.urlencode($cutoff->toIso8601String()))
                ->json('resumes'),
            'id'
        );
        $this->assertContains($resume->id, $ids);
    }

    public function test_pdf_streams_the_rendered_document(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['full_name' => 'Jane Doe']);

        $this->withToken($this->tokenFor($user))
            ->get("/api/resumes/{$resume->id}/pdf")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_pdf_hides_other_users_resumes(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();

        $this->withToken($this->tokenFor($intruder))
            ->get("/api/resumes/{$resume->id}/pdf")
            ->assertNotFound();
    }
}
