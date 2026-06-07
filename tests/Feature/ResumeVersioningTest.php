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
        $this->assertTrue(UserLimits::resumeLimit($user) !== null && $nonSnapshotCount <= UserLimits::resumeLimit($user));
    }
}
