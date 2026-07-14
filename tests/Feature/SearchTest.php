<?php

namespace Tests\Feature;

use App\Models\CoverLetter;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_matches_resume_by_content_scoped_to_user(): void
    {
        $user = User::factory()->create();
        $mine = Resume::factory()->for($user)->create(['name' => 'Kubernetes Platform Engineer']);
        $theirs = Resume::factory()->create(['name' => 'Kubernetes Consultant']);

        $response = $this->actingAs($user)->getJson('/search?q=kubernetes');

        $response->assertOk();
        $ids = collect($response->json('resumes'))->pluck('id');
        $this->assertTrue($ids->contains($mine->id));
        $this->assertFalse($ids->contains($theirs->id));
    }

    public function test_matches_cover_letter_by_name_or_body(): void
    {
        $user = User::factory()->create();
        $letter = CoverLetter::factory()->for($user)->create([
            'name' => 'Application to Stripe',
            'body' => 'I am excited about distributed systems.',
        ]);

        $byName = $this->actingAs($user)->getJson('/search?q=stripe');
        $this->assertEquals($letter->id, $byName->json('coverLetters.0.id'));

        $byBody = $this->actingAs($user)->getJson('/search?q=distributed');
        $this->assertEquals($letter->id, $byBody->json('coverLetters.0.id'));
    }

    public function test_limits_to_five_results_each(): void
    {
        $user = User::factory()->create();
        Resume::factory()->count(8)->for($user)->create(['name' => 'Data Engineer']);

        $response = $this->actingAs($user)->getJson('/search?q=data engineer');

        $this->assertCount(5, $response->json('resumes'));
    }

    public function test_empty_query_returns_empty_arrays(): void
    {
        $user = User::factory()->create();
        Resume::factory()->for($user)->create(['name' => 'Anything']);

        $response = $this->actingAs($user)->getJson('/search?q=');

        $response->assertOk();
        $this->assertSame([], $response->json('resumes'));
        $this->assertSame([], $response->json('coverLetters'));
    }

    public function test_requires_authentication(): void
    {
        $this->getJson('/search?q=test')->assertUnauthorized();
    }
}
