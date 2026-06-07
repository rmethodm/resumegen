<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeTag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeTagTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_add_tag_to_resume(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->post(route('builder.tags.store', $resume), [
                'label' => 'Frontend',
                'color' => '#6366f1',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('resume_tags', [
            'resume_id' => $resume->id,
            'label' => 'Frontend',
            'color' => '#6366f1',
        ]);
    }

    public function test_max_5_tags_enforced(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        ResumeTag::factory()->count(5)->create(['resume_id' => $resume->id]);

        $this->actingAs($user)
            ->post(route('builder.tags.store', $resume), [
                'label' => 'Extra',
                'color' => '#6366f1',
            ])
            ->assertStatus(422);
    }

    public function test_user_cannot_add_tag_to_others_resume(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->for($other)->create();

        $this->actingAs($user)
            ->post(route('builder.tags.store', $resume), [
                'label' => 'Hack',
                'color' => '#6366f1',
            ])
            ->assertForbidden();
    }

    public function test_user_can_delete_own_tag(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $tag = ResumeTag::factory()->create(['resume_id' => $resume->id]);

        $this->actingAs($user)
            ->delete(route('builder.tags.destroy', [$resume, $tag]))
            ->assertRedirect();

        $this->assertDatabaseMissing('resume_tags', ['id' => $tag->id]);
    }

    public function test_user_cannot_delete_others_tag(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->for($other)->create();
        $tag = ResumeTag::factory()->create(['resume_id' => $resume->id]);

        $this->actingAs($user)
            ->delete(route('builder.tags.destroy', [$resume, $tag]))
            ->assertForbidden();
    }

    public function test_tags_returned_in_resume_index(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        ResumeTag::factory()->create(['resume_id' => $resume->id, 'label' => 'SWE', 'color' => '#6366f1']);

        $response = $this->actingAs($user)
            ->get(route('builder.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->has('resumes.0.tags', 1)
        );
    }

    public function test_invalid_color_rejected(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->post(route('builder.tags.store', $resume), [
                'label' => 'Test',
                'color' => 'notacolor',
            ])
            ->assertSessionHasErrors('color');
    }
}
