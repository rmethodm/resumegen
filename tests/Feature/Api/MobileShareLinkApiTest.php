<?php

namespace Tests\Feature\Api;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\User;
use App\Support\MobileApiToken;
use Illuminate\Foundation\Testing\RefreshDatabase;

class MobileShareLinkApiTest extends ApiTestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken(
            MobileApiToken::TOKEN_NAME,
            [MobileApiToken::TOKEN_ABILITY]
        )->plainTextToken;
    }

    public function test_show_returns_null_when_no_link_exists(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->withToken($this->tokenFor($user))
            ->getJson("/api/resumes/{$resume->id}/share")
            ->assertOk()
            ->assertJsonPath('share', null);
    }

    public function test_store_creates_a_link_and_is_idempotent(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $token = $this->tokenFor($user);

        $first = $this->withToken($token)
            ->postJson("/api/resumes/{$resume->id}/share")
            ->assertCreated();

        $this->withToken($token)
            ->postJson("/api/resumes/{$resume->id}/share")
            ->assertOk()
            ->assertJsonPath('share.id', $first->json('share.id'));

        $this->assertSame(1, ResumeShareLink::where('resume_id', $resume->id)->count());
    }

    public function test_foreign_resume_share_is_hidden(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();

        $this->withToken($this->tokenFor($intruder))
            ->postJson("/api/resumes/{$resume->id}/share")
            ->assertNotFound();
    }

    public function test_update_changes_settings(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = $resume->shareLink()->create();

        $this->withToken($this->tokenFor($user))
            ->putJson("/api/share-links/{$link->id}", ['require_email' => true])
            ->assertOk()
            ->assertJsonPath('share.require_email', true);

        $this->assertTrue($link->fresh()->require_email);
    }

    public function test_enabling_password_without_one_is_rejected(): void
    {
        // Enabling protection with no password stored and none sent would
        // lock every visitor out behind a password nobody knows.
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = $resume->shareLink()->create();

        $this->withToken($this->tokenFor($user))
            ->putJson("/api/share-links/{$link->id}", ['require_password' => true])
            ->assertUnprocessable();

        $this->assertFalse($link->fresh()->require_password);
    }

    /**
     * Same lock-out guard as the web modal, from the other direction:
     * clearing the hash while the gate stays on leaves a link nothing can
     * unlock.
     */
    public function test_clearing_password_while_protection_stays_on_is_rejected(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = $resume->shareLink()->create([
            'require_password' => true,
            'password' => 'secret1',
        ]);

        $this->withToken($this->tokenFor($user))
            ->putJson("/api/share-links/{$link->id}", ['password' => null])
            ->assertUnprocessable();

        $this->assertNotNull($link->fresh()->password);
    }

    public function test_update_rejects_foreign_link(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $link = Resume::factory()->for($owner)->create()->shareLink()->create();

        $this->withToken($this->tokenFor($intruder))
            ->putJson("/api/share-links/{$link->id}", ['require_email' => true])
            ->assertNotFound();
    }

    public function test_destroy_deletes_the_link(): void
    {
        $user = User::factory()->create();
        $link = Resume::factory()->for($user)->create()->shareLink()->create();

        $this->withToken($this->tokenFor($user))
            ->deleteJson("/api/share-links/{$link->id}")
            ->assertNoContent();

        $this->assertModelMissing($link);
    }

    public function test_token_without_mobile_ability_is_forbidden(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $token = $user->createToken('other', ['something-else'])->plainTextToken;

        $this->withToken($token)
            ->getJson("/api/resumes/{$resume->id}/share")
            ->assertForbidden();
    }
}
