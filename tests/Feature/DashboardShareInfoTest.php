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

    public function test_dashboard_includes_share_info_for_all_resumes(): void
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

                    return $share !== null
                        && $share['id'] === $link->id
                        && $share['url'] === route('share.show', $link->token)
                        && $share['view_count'] === 2
                        && count($share['views']) === 2
                        && $share['require_password'] === true
                        && $share['require_email'] === true
                        && $share['allow_download'] === false
                        && $share['is_expired'] === false
                        && $share['expires_at'] === $link->expires_at?->toDateString()
                        && array_key_exists('password', $share)
                        && $versionShare !== null
                        && $versionShare['view_count'] === 2
                        && $unsharedRow['share'] === null
                        && collect($unsharedRow['versions'])->every(fn (array $v): bool => $v['share'] === null);
                }));
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
                ->where('resumes.0.share.is_expired', true));
    }
}
