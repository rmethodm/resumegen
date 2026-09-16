<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\AiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use OpenAI\Laravel\Facades\OpenAI;
use OpenAI\Resources\Chat;
use OpenAI\Responses\Chat\CreateResponse;
use Tests\TestCase;

class AiServiceReviewPresetTest extends TestCase
{
    use RefreshDatabase;

    private function fakeReviewResponse()
    {
        return OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    ['message' => ['role' => 'assistant', 'content' => '{"suggestions":[{"id":"s1","label":"Tighten the summary","severity":"medium","section":"summary","detail":"Cut it to two sentences."}]}']],
                ],
                'usage' => ['prompt_tokens' => 50, 'completion_tokens' => 20],
            ]),
        ]);
    }

    public function test_general_preset_ignores_jd_even_when_present(): void
    {
        $user = User::factory()->create();
        $fake = $this->fakeReviewResponse();

        $result = app(AiService::class)->reviewResume($user, ['summary' => 'x'], 'Senior PHP Engineer', 'general');

        $this->assertSame('s1', $result['suggestions'][0]['id']);
        $this->assertArrayHasKey('ai_request_id', $result);

        $fake->assertSent(Chat::class, function ($method, $parameters) {
            $prompt = $parameters['messages'][0]['content'] ?? '';

            return $method === 'create'
                && ! str_contains($prompt, 'Senior PHP Engineer');
        });
    }

    public function test_tailor_jd_preset_includes_jd_in_prompt(): void
    {
        $user = User::factory()->create();
        $fake = $this->fakeReviewResponse();

        $result = app(AiService::class)->reviewResume($user, ['summary' => 'x'], 'Senior PHP Engineer', 'tailor_jd');

        $this->assertSame('s1', $result['suggestions'][0]['id']);

        $fake->assertSent(Chat::class, function ($method, $parameters) {
            $prompt = $parameters['messages'][0]['content'] ?? '';

            return $method === 'create'
                && str_contains($prompt, 'Senior PHP Engineer');
        });
    }

    public function test_unknown_preset_throws(): void
    {
        $user = User::factory()->create();

        $this->expectException(InvalidArgumentException::class);

        app(AiService::class)->reviewResume($user, ['summary' => 'x'], null, 'not-a-real-preset');
    }

    public function test_logs_ai_request_with_resume_review_feature(): void
    {
        $user = User::factory()->create();
        $this->fakeReviewResponse();

        app(AiService::class)->reviewResume($user, ['summary' => 'x'], null, 'general');

        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'resume_review',
            'model' => 'gpt-4o',
        ]);
    }
}
