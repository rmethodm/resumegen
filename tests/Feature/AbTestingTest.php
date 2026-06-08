<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AbTestingTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_variant_creates_resume_with_ab_parent_id(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['name' => 'My Resume']);

        $response = $this->actingAs($user)
            ->post(route('builder.create-variant', $resume->id));

        $response->assertRedirect();

        $variant = Resume::where('ab_parent_id', $resume->id)->first();
        $this->assertNotNull($variant);
        $this->assertStringContainsString('Variant', $variant->name);
    }

    public function test_create_variant_requires_ownership(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();

        $response = $this->actingAs($other)
            ->post(route('builder.create-variant', $resume->id));

        $response->assertStatus(403);
    }

    public function test_ab_compare_returns_stats_for_group(): void
    {
        $user = User::factory()->create();
        $parent = Resume::factory()->for($user)->create(['name' => 'Resume A']);
        $variant = Resume::factory()->for($user)->create([
            'name' => 'Resume B',
            'ab_parent_id' => $parent->id,
        ]);

        $response = $this->actingAs($user)
            ->get(route('builder.ab-compare', $parent->id));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('ResumeBuilder/AbCompare')
            ->has('resumes', 2)
        );
    }

    public function test_index_includes_ab_parent_id_on_resume_rows(): void
    {
        $user = User::factory()->create();
        $parent = Resume::factory()->for($user)->create();
        Resume::factory()->for($user)->create(['ab_parent_id' => $parent->id]);

        $response = $this->actingAs($user)->get(route('builder.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->has('resumes', 2, fn ($r) => $r->has('ab_parent_id')->etc())
        );
    }

    public function test_deleting_parent_also_deletes_variant(): void
    {
        $user = User::factory()->create();
        $parent = Resume::factory()->for($user)->create();
        $variant = Resume::factory()->for($user)->create(['ab_parent_id' => $parent->id]);

        $this->actingAs($user)->delete(route('builder.destroy', $parent->id));

        $this->assertModelMissing($variant);
    }
}
