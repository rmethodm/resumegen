<?php

namespace Tests\Feature\Admin;

use App\Models\AdminActionLog;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AdminActionLogTest extends TestCase
{
    use RefreshDatabase;

    private function adminUrl(string $path): string
    {
        return 'http://'.config('app.admin_domain').$path;
    }

    public function test_disable_writes_admin_action_log(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();

        $this->actingAs($admin)
            ->post($this->adminUrl('/users/'.$user->id.'/disable'))
            ->assertRedirect();

        $this->assertDatabaseHas('admin_action_logs', [
            'actor_id' => $admin->id,
            'target_user_id' => $user->id,
            'action' => 'disable',
        ]);
    }

    public function test_user_show_includes_recent_actions(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();

        AdminActionLog::record($admin, $user, 'verify_email');

        $this->actingAs($admin)
            ->get($this->adminUrl('/users/'.$user->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Users/Show')
                ->has('actions', 1)
                ->where('actions.0.action', 'verify_email')
                ->where('actions.0.actor.email', $admin->email));
    }

    public function test_verify_enable_and_revoke_are_logged(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->unverified()->create();

        $this->actingAs($admin)->post($this->adminUrl('/users/'.$user->id.'/verify-email'));
        $this->actingAs($admin)->post($this->adminUrl('/users/'.$user->id.'/disable'));
        $this->actingAs($admin)->post($this->adminUrl('/users/'.$user->id.'/enable'));
        $this->actingAs($admin)->post($this->adminUrl('/users/'.$user->id.'/revoke-tokens'));

        $this->assertSame(4, AdminActionLog::query()->where('target_user_id', $user->id)->count());
        $this->assertEqualsCanonicalizing(
            ['verify_email', 'disable', 'enable', 'revoke_tokens'],
            AdminActionLog::query()->where('target_user_id', $user->id)->pluck('action')->all(),
        );
    }

    public function test_resend_verification_notifies_and_is_logged(): void
    {
        Notification::fake();

        $admin = User::factory()->admin()->create();
        $user = User::factory()->unverified()->create();

        $this->actingAs($admin)
            ->post($this->adminUrl('/users/'.$user->id.'/resend-verification'))
            ->assertRedirect();

        Notification::assertSentTo($user, VerifyEmail::class);

        $this->assertDatabaseHas('admin_action_logs', [
            'actor_id' => $admin->id,
            'target_user_id' => $user->id,
            'action' => 'resend_verification',
        ]);
    }
}
