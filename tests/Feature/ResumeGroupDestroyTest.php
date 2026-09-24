<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeGroupDestroyTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Deletes are hard, so resume_deletions is the only way the mobile app's
     * `since` pull learns a resume is gone. A group delete that relied on the
     * FK cascade would leave the resume alive forever on other devices.
     */
    public function test_deleting_a_group_logs_its_resume_for_mobile_sync(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->delete(route('resume-groups.destroy', $resume->group_id))
            ->assertRedirect(route('dashboard'));

        $this->assertDatabaseMissing('resumes', ['id' => $resume->id]);
        $this->assertDatabaseMissing('resume_groups', ['id' => $resume->group_id]);
        $this->assertDatabaseHas('resume_deletions', [
            'user_id' => $user->id,
            'resume_id' => $resume->id,
        ]);
    }
}
