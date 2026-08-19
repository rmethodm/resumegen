<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardShareInfoTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_includes_lean_share_badges_without_preview(): void
    {
        $user = User::factory()->create();
        $shared = Resume::factory()->for($user)->create(['title' => 'Shared Resume']);
        $unshared = Resume::factory()->for($user)->create(['title' => 'Private Resume']);

        $link = ResumeShareLink::factory()->for($shared)->create([
            'require_password' => true,
            'require_email' => true,
            'allow_download' => false,
            'expires_at' => now()->addDays(14),
        ]);
        $link->views()->create(['email' => 'recruiter@example.com']);
        $link->views()->create(['email' => 'hiring@company.com']);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->missing('resumes') // deferred — not resolved on the initial full visit
                ->loadDeferredProps(fn ($reload) => $reload
                    ->has('resumes', 2)
                    ->where('resumes', function ($resumes) use ($shared, $unshared, $link) {
                        $rows = collect($resumes)->keyBy('id');

                        $sharedRow = $rows->get($shared->id);
                        $unsharedRow = $rows->get($unshared->id);

                        if ($sharedRow === null || $unsharedRow === null) {
                            return false;
                        }

                        $share = $sharedRow['share'] ?? null;
                        $versionShare = collect($sharedRow['versions'])->firstWhere('id', $shared->id)['share'] ?? null;

                        // Lean badge: view_count yes, no views array, no password, no preview.
                        return $share !== null
                            && $share['id'] === $link->id
                            && $share['url'] === route('share.show', $link->token)
                            && $share['view_count'] === 2
                            && ! array_key_exists('views', $share)
                            && ! array_key_exists('password', $share)
                            && ! array_key_exists('preview', $sharedRow)
                            && $share['require_password'] === true
                            && $share['require_email'] === true
                            && $share['is_expired'] === false
                            && $share['expires_at'] === $link->expires_at?->toDateString()
                            && $versionShare !== null
                            && $versionShare['view_count'] === 2
                            && ! array_key_exists('password', $versionShare)
                            && $unsharedRow['share'] === null
                            && collect($unsharedRow['versions'])->every(fn (array $v): bool => $v['share'] === null);
                    })));
    }

    public function test_dashboard_renders_resumes_without_a_group(): void
    {
        $user = User::factory()->create();

        // Mimic seeders: WithoutModelEvents skips the creating hook that
        // assigns a ResumeGroup, leaving group_id null.
        $orphan = Resume::withoutEvents(fn () => Resume::factory()->for($user)->create([
            'title' => 'Orphan Seed Resume',
            'group_id' => null,
        ]));

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->loadDeferredProps(fn ($reload) => $reload
                    ->has('resumes', 1)
                    ->where('resumes.0.id', $orphan->id)
                    ->where('resumes.0.title', 'Orphan Seed Resume')
                    ->where('resumes.0.group_id', null)));
    }

    public function test_dashboard_marks_expired_share_links(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        ResumeShareLink::factory()->for($resume)->create([
            'expires_at' => now()->subDay(),
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->loadDeferredProps(fn ($reload) => $reload
                    ->where('resumes.0.share.is_expired', true)));
    }

    public function test_share_show_returns_full_modal_payload_for_owner(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create([
            'require_password' => true,
            'password' => 'secret12',
            'require_email' => true,
        ]);
        $link->views()->create(['email' => 'recruiter@example.com']);

        $this->actingAs($user)
            ->getJson(route('resumes.share.show', $resume))
            ->assertOk()
            ->assertJsonPath('share.id', $link->id)
            ->assertJsonPath('share.url', route('share.show', $link->token))
            ->assertJsonPath('share.has_password', true)
            ->assertJsonMissingPath('share.password')
            ->assertJsonPath('share.view_count', 1)
            ->assertJsonCount(1, 'share.views')
            ->assertJsonPath('share.views.0.email', 'recruiter@example.com')
            ->assertJsonPath('share.is_expired', false);
    }

    public function test_share_show_returns_null_when_no_link(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->getJson(route('resumes.share.show', $resume))
            ->assertOk()
            ->assertJsonPath('share', null);
    }

    public function test_share_show_is_forbidden_for_non_owner(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();
        ResumeShareLink::factory()->for($resume)->create();

        $this->actingAs($other)
            ->getJson(route('resumes.share.show', $resume))
            ->assertNotFound();
    }
}
