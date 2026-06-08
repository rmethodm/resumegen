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
}
