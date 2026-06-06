<?php

namespace Tests\Unit;

use App\Models\Resume;
use App\Models\User;
use App\Services\InterviewCoachService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class InterviewCoachServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_array_of_8_questions(): void
    {
        config(['services.anthropic.key' => 'test-key']);

        $questions = array_map(
            fn ($i) => ['question' => "Question $i?", 'hint' => "Think about time $i"],
            range(1, 8)
        );

        Http::fake([
            'https://api.anthropic.com/*' => Http::response([
                'content' => [['text' => json_encode($questions)]],
                'usage' => ['input_tokens' => 200, 'output_tokens' => 400],
            ], 200),
        ]);

        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $result = (new InterviewCoachService)->generate($resume, 'Software Engineer', null, $user);

        $this->assertCount(8, $result);
        $this->assertArrayHasKey('question', $result[0]);
        $this->assertArrayHasKey('hint', $result[0]);
    }

    public function test_caps_at_8_questions_even_if_ai_returns_more(): void
    {
        config(['services.anthropic.key' => 'test-key']);

        $questions = array_map(
            fn ($i) => ['question' => "Question $i?", 'hint' => "Hint $i"],
            range(1, 12)
        );

        Http::fake([
            'https://api.anthropic.com/*' => Http::response([
                'content' => [['text' => json_encode($questions)]],
                'usage' => ['input_tokens' => 200, 'output_tokens' => 400],
            ], 200),
        ]);

        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $result = (new InterviewCoachService)->generate($resume, 'Engineer', null, $user);

        $this->assertCount(8, $result);
    }

    public function test_throws_on_bad_json(): void
    {
        config(['services.anthropic.key' => 'test-key']);

        Http::fake([
            'https://api.anthropic.com/*' => Http::response([
                'content' => [['text' => 'not json at all']],
                'usage' => ['input_tokens' => 10, 'output_tokens' => 5],
            ], 200),
        ]);

        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->expectException(\RuntimeException::class);

        (new InterviewCoachService)->generate($resume, 'Engineer', null, $user);
    }

    public function test_logs_usage_before_json_check(): void
    {
        config(['services.anthropic.key' => 'test-key']);

        Http::fake([
            'https://api.anthropic.com/*' => Http::response([
                'content' => [['text' => 'not json']],
                'usage' => ['input_tokens' => 50, 'output_tokens' => 10],
            ], 200),
        ]);

        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        try {
            (new InterviewCoachService)->generate($resume, 'Engineer', null, $user);
        } catch (\RuntimeException) {
        }

        $this->assertDatabaseHas('ai_usage_logs', [
            'user_id' => $user->id,
            'feature' => 'interview_coach',
        ]);
    }

    public function test_throws_when_no_api_key(): void
    {
        config(['services.anthropic.key' => null]);

        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->expectException(\RuntimeException::class);

        (new InterviewCoachService)->generate($resume, 'Engineer', null, $user);
    }
}
