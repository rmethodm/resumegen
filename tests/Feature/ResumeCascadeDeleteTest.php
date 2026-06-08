<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeCascadeDeleteTest extends TestCase
{
    use RefreshDatabase;

    public function test_deleting_parent_resume_deletes_ab_variants(): void
    {
        $user = User::factory()->create();
        $parent = Resume::factory()->for($user)->create();
        $variant = Resume::factory()->for($user)->create(['ab_parent_id' => $parent->id]);

        $parent->delete();

        $this->assertModelMissing($variant);
    }

    public function test_deleting_parent_resume_deletes_snapshots(): void
    {
        $user = User::factory()->create();
        $parent = Resume::factory()->for($user)->create();
        $snapshot = Resume::factory()->for($user)->create([
            'parent_resume_id' => $parent->id,
            'is_snapshot' => true,
        ]);

        $parent->delete();

        $this->assertModelMissing($snapshot);
    }

    public function test_deleting_standalone_resume_does_not_affect_others(): void
    {
        $user = User::factory()->create();
        $a = Resume::factory()->for($user)->create();
        $b = Resume::factory()->for($user)->create();

        $a->delete();

        $this->assertModelMissing($a);
        $this->assertModelExists($b);
    }
}
