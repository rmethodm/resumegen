<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CompletionScoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_empty_resume_returns_score_zero(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create([
            'user_id' => $user->id,
            'contact' => [],
            'summary' => null,
            'experience' => [],
            'education' => [],
            'skills' => [],
            'certifications' => [],
        ]);

        $response = $this->actingAs($user)->get(route('builder.edit', $resume->id));
        $response->assertInertia(fn ($page) => $page->where('completionScore', 0)
        );
    }

    public function test_fully_filled_resume_returns_high_score(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create([
            'user_id' => $user->id,
            'contact' => [
                'full_name' => 'Jane Doe',
                'email' => 'jane@example.com',
                'phone' => '555-1234',
                'location' => 'New York, NY',
                'title' => 'Software Engineer',
            ],
            'summary' => 'Experienced software engineer with 10 years building scalable systems.',
            'experience' => [
                ['company' => 'Acme', 'title' => 'Engineer', 'bullets' => 'Built stuff\nDid things'],
            ],
            'education' => [
                ['school' => 'MIT', 'degree' => 'BS Computer Science'],
            ],
            'skills' => ['PHP', 'Laravel', 'React'],
            'certifications' => [['name' => 'AWS Certified']],
        ]);

        $response = $this->actingAs($user)->get(route('builder.edit', $resume->id));
        $response->assertInertia(fn ($page) => $page->where('completionScore', fn ($score) => $score >= 60)
        );
    }

    public function test_completion_score_prop_is_present_in_edit_page(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('builder.edit', $resume->id));
        $response->assertInertia(fn ($page) => $page->has('completionScore')
        );
    }
}
