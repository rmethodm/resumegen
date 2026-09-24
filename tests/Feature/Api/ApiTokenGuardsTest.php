<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Support\MobileApiToken;
use App\Support\ResumeFillProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;

/**
 * Route-level guards for the token API: token clients must always get JSON,
 * and disabled accounts / wrong-ability tokens must be refused before any
 * request validation runs (a 422 would leak the endpoint's input contract
 * and let a disabled account keep probing it).
 */
class ApiTokenGuardsTest extends ApiTestCase
{
    use RefreshDatabase;

    private function extensionToken(User $user): string
    {
        return $user->createToken(ResumeFillProfile::TOKEN_NAME, [ResumeFillProfile::TOKEN_ABILITY])->plainTextToken;
    }

    private function mobileToken(User $user): string
    {
        return $user->createToken(MobileApiToken::TOKEN_NAME, [MobileApiToken::TOKEN_ABILITY])->plainTextToken;
    }

    public function test_unauthenticated_api_request_without_accept_header_gets_json_401_not_a_redirect(): void
    {
        $this->get('/api/extension/me')
            ->assertUnauthorized()
            ->assertJson(['message' => 'Unauthenticated.']);
    }

    public function test_invalid_api_request_without_accept_header_gets_json_422_not_a_redirect(): void
    {
        $this->post('/api/auth/token', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_disabled_account_is_refused_on_every_extension_endpoint(): void
    {
        $user = User::factory()->create(['disabled_at' => now()]);
        $token = $this->extensionToken($user);

        $this->withToken($token)->getJson('/api/extension/qa-bank')
            ->assertForbidden()
            ->assertJson(['message' => 'Account disabled.']);

        // Refused before validation: an empty body must not produce a 422.
        $this->withToken($token)->postJson('/api/extension/job-applications', [])
            ->assertForbidden();
    }

    public function test_mobile_token_is_refused_on_extension_routes_before_validation(): void
    {
        $user = User::factory()->create();

        $this->withToken($this->mobileToken($user))
            ->postJson('/api/extension/qa-bank', [])
            ->assertForbidden();

        $this->withToken($this->mobileToken($user))
            ->postJson('/api/extension/job-applications', [])
            ->assertForbidden();
    }

    public function test_extension_token_is_refused_on_mobile_routes_before_validation(): void
    {
        $user = User::factory()->create();

        $this->withToken($this->extensionToken($user))
            ->postJson('/api/resumes', ['title' => ['not-a-string']])
            ->assertForbidden();
    }

    public function test_job_url_must_be_an_http_link(): void
    {
        $user = User::factory()->create();

        // Rendered as a clickable link on the Kanban — javascript: must never be stored.
        $this->withToken($this->extensionToken($user))
            ->postJson('/api/extension/job-applications', [
                'company' => 'Acme Corp',
                'role' => 'Senior Engineer',
                'job_url' => 'javascript:alert(1)',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['job_url']);

        $this->assertDatabaseCount('job_applications', 0);
    }

    public function test_any_token_can_revoke_itself(): void
    {
        $user = User::factory()->create();
        $token = $this->extensionToken($user);

        $this->withToken($token)->deleteJson('/api/auth/token')->assertNoContent();

        $this->assertSame(0, $user->tokens()->count());
    }
}
