<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserSupportActionsTest extends TestCase
{
    use RefreshDatabase;

    private function adminUrl(string $path): string
    {
        return 'http://'.config('app.admin_domain').$path;
    }

    public function test_admin_can_verify_user_email(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->unverified()->create();

        $this->actingAs($admin)
            ->post($this->adminUrl('/users/'.$user->id.'/verify-email'))
            ->assertRedirect($this->adminUrl('/users/'.$user->id));

        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_admin_can_disable_user_and_tokens_are_revoked(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        $user->createToken('api');

        $this->actingAs($admin)
            ->post($this->adminUrl('/users/'.$user->id.'/disable'))
            ->assertRedirect($this->adminUrl('/users/'.$user->id));

        $user->refresh();
        $this->assertNotNull($user->disabled_at);
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_admin_cannot_disable_self(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post($this->adminUrl('/users/'.$admin->id.'/disable'))
            ->assertForbidden();

        $this->assertNull($admin->fresh()->disabled_at);
    }

    public function test_admin_can_enable_user(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->disabled()->create();

        $this->actingAs($admin)
            ->post($this->adminUrl('/users/'.$user->id.'/enable'))
            ->assertRedirect($this->adminUrl('/users/'.$user->id));

        $this->assertNull($user->fresh()->disabled_at);
    }

    public function test_admin_can_revoke_tokens_without_disable(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        $user->createToken('api');

        $this->actingAs($admin)
            ->post($this->adminUrl('/users/'.$user->id.'/revoke-tokens'))
            ->assertRedirect($this->adminUrl('/users/'.$user->id));

        $user->refresh();
        $this->assertNull($user->disabled_at);
        $this->assertSame(0, $user->tokens()->count());
    }
}
