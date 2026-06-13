<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeVariantTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_a_variant_redirects_to_new_resume_with_ab_parent_id_set(): void
    {
        $user = User::factory()->create();
        $original = Resume::factory()->for($user)->create();

        $response = $this->actingAs($user)
            ->post(route('builder.create-variant', $original));

        $variant = Resume::where('ab_parent_id', $original->id)->first();

        $this->assertNotNull($variant);
        $response->assertRedirect(route('builder.edit', $variant->id));
        $this->assertSame($original->id, $variant->ab_parent_id);
    }

    public function test_deleting_a_parent_deletes_its_variants(): void
    {
        $user = User::factory()->create();
        $parent = Resume::factory()->for($user)->create();
        $variant = Resume::factory()->for($user)->create(['ab_parent_id' => $parent->id]);

        $this->actingAs($user)
            ->delete(route('builder.destroy', $parent));

        $this->assertDatabaseMissing('resumes', ['id' => $variant->id]);
    }

    public function test_snapshot_resumes_are_excluded_from_resume_count_limit(): void
    {
        $user = User::factory()->free()->create();

        // Free limit is 2 non-snapshots. 1 normal + 3 snapshots: if snapshots counted,
        // the 4 rows would block creation. They must not.
        Resume::factory()->for($user)->create(['is_snapshot' => false]);
        Resume::factory()->for($user)->count(3)->create(['is_snapshot' => true]);

        $response = $this->actingAs($user)
            ->post(route('builder.store'), ['name' => 'New Resume']);

        // Should NOT get a featureGate — should redirect to the new resume's edit page
        // Verify the new resume was created (non-snapshot count is now 2, not blocked)
        $this->assertSame(2, $user->resumes()->nonSnapshot()->count());

        // The response should redirect to a builder edit page (not back with featureGate)
        $response->assertRedirect();
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('/builder/', $location);

        // Ensure a session featureGate was NOT set
        $response->assertSessionMissing('featureGate');
    }

    public function test_ab_variant_is_included_in_dashboard_index(): void
    {
        $user = User::factory()->create();
        $parent = Resume::factory()->for($user)->create(['is_snapshot' => false]);
        Resume::factory()->for($user)->create([
            'ab_parent_id' => $parent->id,
            'is_snapshot' => false,
        ]);

        $response = $this->actingAs($user)
            ->get(route('builder.index'));

        $response->assertInertia(fn ($page) => $page->has('resumes', 2));
    }
}
