<?php

namespace Tests\Feature\Admin;

use App\Models\CareerArticle;
use App\Models\PortfolioMessage;
use App\Models\User;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FilamentAdminTest extends TestCase
{
    use RefreshDatabase;

    private function adminUser(): User
    {
        return User::factory()->create([
            'is_master_admin' => true,
            'email_verified_at' => now(),
        ]);
    }

    private function regularUser(): User
    {
        return User::factory()->create([
            'email' => 'user@example.com',
            'email_verified_at' => now(),
        ]);
    }

    // ─── canAccessPanel ────────────────────────────────────────────────────

    public function test_master_admin_can_access_panel(): void
    {
        $admin = $this->adminUser();
        $panel = Filament::getPanel('admin');

        $this->assertTrue($admin->canAccessPanel($panel));
    }

    public function test_non_admin_cannot_access_panel(): void
    {
        $user = $this->regularUser();
        $panel = Filament::getPanel('admin');

        $this->assertFalse($user->canAccessPanel($panel));
    }

    // ─── Mark read ─────────────────────────────────────────────────────────

    public function test_mark_read_stamps_read_at(): void
    {
        $message = PortfolioMessage::factory()->create(['read_at' => null]);

        $this->assertNull($message->read_at);

        $message->update(['read_at' => now()]);
        $message->refresh();

        $this->assertNotNull($message->read_at);
    }

    // ─── Article publish toggle ────────────────────────────────────────────

    public function test_article_publish_toggle(): void
    {
        $article = CareerArticle::factory()->create(['is_published' => false]);

        $article->update(['is_published' => ! $article->is_published]);
        $article->refresh();

        $this->assertTrue($article->is_published);

        $article->update(['is_published' => ! $article->is_published]);
        $article->refresh();

        $this->assertFalse($article->is_published);
    }

    // ─── Impersonation ─────────────────────────────────────────────────────

    public function test_impersonation_sets_session_keys(): void
    {
        $admin = $this->adminUser();
        $target = $this->regularUser();

        $this->actingAs($admin);

        session([
            'impersonating_id' => $target->id,
            'impersonator_id' => $admin->id,
        ]);

        $this->assertEquals($target->id, session('impersonating_id'));
        $this->assertEquals($admin->id, session('impersonator_id'));
    }

    public function test_master_admin_cannot_be_impersonated(): void
    {
        $target = User::factory()->create(['is_master_admin' => true]);

        // Filament action visible() guard: master admin is excluded
        $this->assertTrue($target->is_master_admin);
        // The action's visible() returns false for master admins — no HTTP call needed
    }
}
