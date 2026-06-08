<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MasterResumeTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_set_resume_as_master(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['is_master' => false]);

        $this->actingAs($user)
            ->patch(route('builder.set-master', $resume->id))
            ->assertRedirect();

        $this->assertTrue($resume->fresh()->is_master);
    }

    public function test_user_can_create_tailored_copy(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['name' => 'My Resume', 'is_master' => true]);

        $this->actingAs($user)
            ->post(route('builder.create-tailored-copy', $resume->id))
            ->assertRedirect();

        $copy = Resume::where('master_resume_id', $resume->id)->first();
        $this->assertNotNull($copy);
        $this->assertStringContainsString('Tailored', $copy->name);
        $this->assertEquals($resume->id, $copy->master_resume_id);
    }

    public function test_dashboard_index_includes_master_resume_fields(): void
    {
        $user = User::factory()->create();
        $master = Resume::factory()->for($user)->create(['is_master' => true]);
        Resume::factory()->for($user)->create(['master_resume_id' => $master->id]);

        $this->actingAs($user)
            ->get(route('builder.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('ResumeBuilder/Index')
                ->has('resumes', 2)
                ->has('resumes.0.is_master')
                ->has('resumes.0.master_resume_id')
            );
    }

    public function test_edit_page_includes_master_out_of_sync_when_master_is_newer(): void
    {
        $user = User::factory()->create();
        $master = Resume::factory()->for($user)->create(['is_master' => true]);
        $copy = Resume::factory()->for($user)->create([
            'master_resume_id' => $master->id,
            'master_synced_at' => now()->subHour(),
        ]);
        $master->touch();

        $this->actingAs($user)
            ->get(route('builder.edit', $copy->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('masterOutOfSync', true)
                ->where('masterResume.id', $master->id)
            );
    }

    public function test_edit_page_shows_master_out_of_sync_when_never_synced(): void
    {
        $user = User::factory()->create();
        $master = Resume::factory()->for($user)->create(['is_master' => true]);
        $copy = Resume::factory()->for($user)->create([
            'master_resume_id' => $master->id,
            'master_synced_at' => null,
        ]);

        $this->actingAs($user)
            ->get(route('builder.edit', $copy->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('masterOutOfSync', true)
            );
    }

    public function test_syncing_master_records_current_timestamp(): void
    {
        $user = User::factory()->create();
        $master = Resume::factory()->for($user)->create(['is_master' => true]);
        $copy = Resume::factory()->for($user)->create([
            'master_resume_id' => $master->id,
            'master_synced_at' => now()->subHour(),
        ]);

        $this->actingAs($user)
            ->patch(route('builder.sync-master', $copy->id))
            ->assertRedirect();

        $this->assertNotNull($copy->fresh()->master_synced_at);
        $this->assertTrue($copy->fresh()->master_synced_at->gt(now()->subMinute()));
    }

    public function test_user_cannot_set_master_on_another_users_resume(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create(['is_master' => false]);

        $this->actingAs($other)
            ->patch(route('builder.set-master', $resume->id))
            ->assertForbidden();
    }

    public function test_user_cannot_create_tailored_copy_of_another_users_resume(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create(['is_master' => true]);

        $this->actingAs($other)
            ->post(route('builder.create-tailored-copy', $resume->id))
            ->assertForbidden();
    }

    public function test_user_cannot_sync_master_on_another_users_resume(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $master = Resume::factory()->for($owner)->create(['is_master' => true]);
        $copy = Resume::factory()->for($owner)->create([
            'master_resume_id' => $master->id,
            'master_synced_at' => now()->subHour(),
        ]);

        $this->actingAs($other)
            ->patch(route('builder.sync-master', $copy->id))
            ->assertForbidden();
    }

    public function test_pull_from_master_copies_content_to_copy(): void
    {
        $user = User::factory()->create();
        $master = Resume::factory()->for($user)->create([
            'is_master' => true,
            'summary' => 'Master summary text',
            'template' => 'modern',
        ]);
        $copy = Resume::factory()->for($user)->create([
            'master_resume_id' => $master->id,
            'master_synced_at' => now()->subHour(),
            'summary' => 'Old copy summary',
            'template' => 'classic',
        ]);

        $this->actingAs($user)
            ->post(route('builder.pull-from-master', $copy->id))
            ->assertRedirect();

        $copy->refresh();
        $this->assertEquals('Master summary text', $copy->summary);
        $this->assertEquals('modern', $copy->template);
        $this->assertNotNull($copy->master_synced_at);
        $this->assertTrue($copy->master_synced_at->gt(now()->subMinute()));
    }

    public function test_pull_from_master_sets_master_synced_at(): void
    {
        $user = User::factory()->create();
        $master = Resume::factory()->for($user)->create(['is_master' => true]);
        $copy = Resume::factory()->for($user)->create([
            'master_resume_id' => $master->id,
            'master_synced_at' => now()->subDay(),
        ]);

        $this->actingAs($user)
            ->post(route('builder.pull-from-master', $copy->id))
            ->assertRedirect();

        $this->assertTrue($copy->fresh()->master_synced_at->gt(now()->subMinute()));
    }

    public function test_pull_from_master_forbidden_for_other_user(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $master = Resume::factory()->for($owner)->create(['is_master' => true]);
        $copy = Resume::factory()->for($owner)->create(['master_resume_id' => $master->id]);

        $this->actingAs($other)
            ->post(route('builder.pull-from-master', $copy->id))
            ->assertForbidden();
    }
}
