<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeAiReviewCacheTest extends TestCase
{
    use RefreshDatabase;

    public function test_ai_review_is_cast_to_array_and_generated_at_to_datetime(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $resume->ai_review = [['id' => 'a', 'label' => 'x', 'severity' => 'high', 'section' => 'summary', 'detail' => 'y']];
        $resume->ai_review_generated_at = now();
        $resume->save();

        $fresh = $resume->fresh();

        $this->assertIsArray($fresh->ai_review);
        $this->assertSame('a', $fresh->ai_review[0]['id']);
        $this->assertNotNull($fresh->ai_review_generated_at);
        $this->assertTrue($fresh->ai_review_generated_at->isToday());
    }

    public function test_ai_review_is_not_mass_assignable(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $resume->update(['ai_review' => [['id' => 'x']]]);

        $this->assertNull($resume->fresh()->ai_review);
    }
}
