<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserDeletionCleanupTest extends TestCase
{
    use RefreshDatabase;

    private function thumbnailPath(Resume $resume): string
    {
        return storage_path("app/thumbnails/{$resume->id}.png");
    }

    private function writeThumbnail(Resume $resume): string
    {
        $path = $this->thumbnailPath($resume);
        @mkdir(dirname($path), 0755, true);
        file_put_contents($path, 'fake-png');

        return $path;
    }

    /**
     * The resumes.user_id FK is cascadeOnDelete, so deleting a user removes
     * their resume rows in the database without firing model events. Without a
     * per-model delete, Resume's `deleting` observer never runs and every
     * thumbnail the user generated is orphaned on disk forever — a storage leak
     * and a data-retention problem, since the user asked to be forgotten.
     */
    public function test_deleting_a_user_removes_their_resume_thumbnails_from_disk(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $path = $this->writeThumbnail($resume);

        $this->assertFileExists($path);

        $user->delete();

        $this->assertFileDoesNotExist($path);
        $this->assertModelMissing($resume);
    }

    /**
     * A/B variants are resumes too. Deleting the owner must recurse through the
     * whole tree, not just the top-level resumes.
     */
    public function test_deleting_a_user_removes_nested_ab_variant_thumbnails(): void
    {
        $user = User::factory()->create();
        $parent = Resume::factory()->for($user)->create();
        $variant = Resume::factory()->for($user)->create(['ab_parent_id' => $parent->id]);

        $parentPath = $this->writeThumbnail($parent);
        $variantPath = $this->writeThumbnail($variant);

        $user->delete();

        $this->assertFileDoesNotExist($parentPath);
        $this->assertFileDoesNotExist($variantPath);
        $this->assertModelMissing($variant);
    }

    /**
     * Deleting one user must not touch another user's files.
     */
    public function test_deleting_a_user_leaves_other_users_thumbnails_alone(): void
    {
        $victim = User::factory()->create();
        $bystander = User::factory()->create();

        $victimResume = Resume::factory()->for($victim)->create();
        $bystanderResume = Resume::factory()->for($bystander)->create();

        $victimPath = $this->writeThumbnail($victimResume);
        $bystanderPath = $this->writeThumbnail($bystanderResume);

        $victim->delete();

        $this->assertFileDoesNotExist($victimPath);
        $this->assertFileExists($bystanderPath);
        $this->assertModelExists($bystanderResume);

        @unlink($bystanderPath);
    }
}
