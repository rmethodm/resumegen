<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeVersioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_snapshots_excluded_from_resume_limit_count(): void
    {
        $user = User::factory()->free()->create();

        Resume::factory()->count(5)->create(['user_id' => $user->id]);
        $parent = $user->resumes()->first();
        Resume::factory()->create([
            'user_id' => $user->id,
            'parent_resume_id' => $parent->id,
            'is_snapshot' => true,
        ]);

        $nonSnapshotCount = $user->resumes()->where('is_snapshot', false)->count();
        $this->assertEquals(5, $nonSnapshotCount);
        $this->assertTrue(UserLimits::resumeLimit($user) >= $nonSnapshotCount);
    }

    public function test_save_version_creates_snapshot(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id, 'name' => 'My Resume']);

        $response = $this->actingAs($user)->post(route('builder.save-version', $resume), [
            'name' => 'My Resume — Acme Application',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('resumes', [
            'user_id' => $user->id,
            'parent_resume_id' => $resume->id,
            'is_snapshot' => true,
            'name' => 'My Resume — Acme Application',
        ]);
    }

    public function test_save_version_auto_names_if_no_name_given(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id, 'name' => 'Dev Resume']);

        $this->actingAs($user)->post(route('builder.save-version', $resume));

        $snapshot = Resume::where('parent_resume_id', $resume->id)->first();
        $this->assertNotNull($snapshot);
        $this->assertStringContainsString('Dev Resume', $snapshot->name);
    }

    public function test_cannot_save_version_of_another_users_resume(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $owner->id]);

        $response = $this->actingAs($other)->post(route('builder.save-version', $resume));

        $response->assertStatus(403);
        $this->assertDatabaseCount('resumes', 1);
    }

    public function test_snapshot_is_excluded_from_resume_index(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        Resume::factory()->create([
            'user_id' => $user->id,
            'parent_resume_id' => $resume->id,
            'is_snapshot' => true,
        ]);

        $this->actingAs($user)->get(route('builder.index'))
            ->assertInertia(fn ($page) => $page->has('resumes', 1));
    }

    public function test_edit_page_includes_snapshots_prop(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        Resume::factory()->create([
            'user_id' => $user->id,
            'parent_resume_id' => $resume->id,
            'is_snapshot' => true,
            'name' => 'My Resume — v1',
        ]);

        $response = $this->actingAs($user)->get(route('builder.edit', $resume));

        $response->assertInertia(fn ($page) => $page
            ->has('snapshots', 1)
            ->where('snapshots.0.name', 'My Resume — v1')
        );
    }
}
