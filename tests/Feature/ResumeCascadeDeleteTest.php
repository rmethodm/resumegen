<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeThread;
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

    /**
     * A bulk delete on the variants relation skips each child's own `deleting`
     * hook, so a grandchild variant survives its grandparent. Nested A/B trees
     * must delete all the way down.
     */
    public function test_deleting_parent_resume_deletes_nested_ab_variants(): void
    {
        $user = User::factory()->create();
        $parent = Resume::factory()->for($user)->create();
        $child = Resume::factory()->for($user)->create(['ab_parent_id' => $parent->id]);
        $grandchild = Resume::factory()->for($user)->create(['ab_parent_id' => $child->id]);

        $parent->delete();

        $this->assertModelMissing($child);
        $this->assertModelMissing($grandchild);
    }

    /**
     * The `deleting` hook no longer removes threads by hand; it relies on the
     * `cascadeOnDelete` FK. This guards that the FK is actually enforced, since
     * a silently-disabled constraint would leak rows rather than fail loudly.
     */
    public function test_deleting_resume_cascades_threads_via_foreign_key(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $thread = ResumeThread::create([
            'resume_id' => $resume->id,
            'sender_name' => 'Ada',
            'sender_email' => 'ada@example.com',
        ]);

        $resume->delete();

        $this->assertModelMissing($thread);
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
