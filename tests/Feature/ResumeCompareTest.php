<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeCompareTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_load_compare_page(): void
    {
        $user = User::factory()->create();
        $resumeA = Resume::factory()->create(['user_id' => $user->id]);
        $resumeB = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)
            ->get(route('builder.compare', $resumeA->id).'?with='.$resumeB->id);

        $response->assertInertia(fn ($page) => $page->component('ResumeBuilder/Compare')
            ->has('resume')
            ->has('other')
        );
    }

    public function test_returns_403_when_other_resume_belongs_to_different_user(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $resumeA = Resume::factory()->create(['user_id' => $user->id]);
        $resumeB = Resume::factory()->create(['user_id' => $otherUser->id]);

        $this->actingAs($user)
            ->get(route('builder.compare', $resumeA->id).'?with='.$resumeB->id)
            ->assertForbidden();
    }

    public function test_returns_404_when_with_param_is_missing(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->get(route('builder.compare', $resume->id))
            ->assertNotFound();
    }

    public function test_resume_and_other_props_have_correct_names(): void
    {
        $user = User::factory()->create();
        $resumeA = Resume::factory()->create(['user_id' => $user->id, 'name' => 'Resume A']);
        $resumeB = Resume::factory()->create(['user_id' => $user->id, 'name' => 'Resume B']);

        $response = $this->actingAs($user)
            ->get(route('builder.compare', $resumeA->id).'?with='.$resumeB->id);

        $response->assertInertia(fn ($page) => $page->where('resume.name', 'Resume A')
            ->where('other.name', 'Resume B')
        );
    }
}
