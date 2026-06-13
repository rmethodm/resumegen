<?php

namespace Tests\Feature\Admin;

use App\Models\CoverLetter;
use App\Models\JobApplication;
use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AdminContentTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['is_master_admin' => true]);
    }

    public function test_index_defaults_to_resumes_with_owner(): void
    {
        $owner = User::factory()->create(['email' => 'owner@example.com']);
        Resume::factory()->for($owner)->create(['name' => 'My CV']);

        $this->actingAs($this->admin())->get(route('admin.content.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Content/Index')
                ->where('type', 'resumes')
                ->has('items.data', 1)
                ->where('items.data.0.name', 'My CV')
                ->where('items.data.0.owner.email', 'owner@example.com')
            );
    }

    public function test_type_switches_dataset(): void
    {
        $owner = User::factory()->create();
        CoverLetter::factory()->for($owner)->create(['name' => 'Dear Hiring']);
        JobApplication::factory()->for($owner)->create(['company' => 'Acme']);

        $this->actingAs($this->admin())->get(route('admin.content.index', ['type' => 'cover-letters']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('type', 'cover-letters')
                ->has('items.data', 1)
                ->where('items.data.0.name', 'Dear Hiring')
            );

        $this->actingAs($this->admin())->get(route('admin.content.index', ['type' => 'jobs']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('type', 'jobs')
                ->where('items.data.0.company', 'Acme')
            );

        $portfolioUser = User::factory()->create(['portfolio_slug' => 'janedoe']);
        $this->actingAs($this->admin())->get(route('admin.content.index', ['type' => 'portfolios']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('type', 'portfolios')
                ->where('items.data.0.portfolio_slug', 'janedoe')
            );
    }

    public function test_search_filters_by_owner_email(): void
    {
        $a = User::factory()->create(['email' => 'findme@example.com']);
        $b = User::factory()->create(['email' => 'other@example.com']);
        Resume::factory()->for($a)->create();
        Resume::factory()->for($b)->create();

        $this->actingAs($this->admin())->get(route('admin.content.index', ['q' => 'findme']))
            ->assertInertia(fn (AssertableInertia $page) => $page->has('items.data', 1));
    }

    public function test_destroy_resume_deletes_and_audits(): void
    {
        $resume = Resume::factory()->for(User::factory())->create();

        $this->actingAs($this->admin())->delete(route('admin.content.resume.destroy', $resume))
            ->assertRedirect();

        $this->assertDatabaseMissing('resumes', ['id' => $resume->id]);
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'content.resume.delete', 'target_id' => $resume->id]);
    }

    public function test_disable_share_link_audits(): void
    {
        $resume = Resume::factory()->for(User::factory())->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

        $this->actingAs($this->admin())->patch(route('admin.content.share-link.disable', $link))
            ->assertRedirect();

        $this->assertFalse($link->fresh()->is_active);
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'content.share-link.disable', 'target_id' => $link->id]);
    }

    public function test_unpublish_portfolio_audits(): void
    {
        $user = User::factory()->create(['portfolio_slug' => 'janedoe', 'portfolio_is_public' => true]);

        $this->actingAs($this->admin())->patch(route('admin.content.portfolio.unpublish', $user))
            ->assertRedirect();

        $this->assertFalse($user->fresh()->portfolio_is_public);
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'content.portfolio.unpublish', 'target_id' => $user->id]);
    }

    public function test_non_admin_forbidden(): void
    {
        $user = User::factory()->create(['is_master_admin' => false]);
        $resume = Resume::factory()->for(User::factory())->create();

        $this->actingAs($user)->get(route('admin.content.index'))->assertForbidden();
        $this->actingAs($user)->delete(route('admin.content.resume.destroy', $resume))->assertForbidden();
    }
}
