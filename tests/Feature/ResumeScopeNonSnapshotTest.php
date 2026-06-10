<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeScopeNonSnapshotTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_snapshot_scope_excludes_snapshots(): void
    {
        $user = User::factory()->create();

        $regular = Resume::factory()->create(['user_id' => $user->id, 'is_snapshot' => false]);
        $snapshot = Resume::factory()->create(['user_id' => $user->id, 'is_snapshot' => true]);

        $results = Resume::nonSnapshot()->get();

        $this->assertTrue($results->contains($regular));
        $this->assertFalse($results->contains($snapshot));
    }

    public function test_non_snapshot_scope_returns_all_non_snapshots(): void
    {
        $user = User::factory()->create();

        Resume::factory()->count(3)->create(['user_id' => $user->id, 'is_snapshot' => false]);
        Resume::factory()->count(2)->create(['user_id' => $user->id, 'is_snapshot' => true]);

        $this->assertCount(3, Resume::nonSnapshot()->get());
    }
}
