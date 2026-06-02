<?php

namespace Tests\Feature;

use App\Models\AiModelRate;
use App\Models\AiUsageLog;
use App\Models\User;
use App\Services\AiUsageLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiUsageLoggerTest extends TestCase
{
    use RefreshDatabase;

    public function test_logs_usage_with_correct_cost(): void
    {
        AiModelRate::create([
            'provider' => 'openai', 'model' => 'gpt-4o-mini',
            'input_cost_per_million' => 0.15, 'output_cost_per_million' => 0.60,
            'effective_from' => '2026-01-01',
        ]);

        $user = User::factory()->create();

        AiUsageLogger::log(
            user: $user,
            provider: 'openai',
            model: 'gpt-4o-mini',
            feature: 'ats_score',
            inputTokens: 1_000_000,
            outputTokens: 1_000_000,
        );

        $log = AiUsageLog::first();
        $this->assertNotNull($log);
        $this->assertEquals($user->id, $log->user_id);
        $this->assertEquals('openai', $log->provider);
        $this->assertEquals('gpt-4o-mini', $log->model);
        $this->assertEquals('ats_score', $log->feature);
        $this->assertEquals(1_000_000, $log->input_tokens);
        $this->assertEquals(1_000_000, $log->output_tokens);
        $this->assertEqualsWithDelta(0.75, $log->cost_usd, 0.0001); // 0.15 + 0.60
    }

    public function test_logs_with_zero_cost_when_no_rate_found(): void
    {
        $user = User::factory()->create();

        AiUsageLogger::log(
            user: $user,
            provider: 'openai',
            model: 'unknown-model',
            feature: 'ai_suggest',
            inputTokens: 100,
            outputTokens: 50,
        );

        $log = AiUsageLog::first();
        $this->assertNotNull($log);
        $this->assertEqualsWithDelta(0.0, $log->cost_usd, 0.0001);
    }

    public function test_logs_with_null_user(): void
    {
        AiUsageLogger::log(
            user: null,
            provider: 'anthropic',
            model: 'claude-sonnet-4-6',
            feature: 'ai_suggest',
            inputTokens: 200,
            outputTokens: 100,
        );

        $this->assertEquals(1, AiUsageLog::count());
        $this->assertNull(AiUsageLog::first()->user_id);
    }

    public function test_never_throws_on_exception(): void
    {
        // Deliberately pass invalid data — logger must swallow it
        AiUsageLogger::log(
            user: null,
            provider: str_repeat('x', 300), // too long for column
            model: 'gpt-4o-mini',
            feature: 'ats_score',
            inputTokens: 0,
            outputTokens: 0,
        );

        // If we reach here without exception, the test passes
        $this->assertTrue(true);
    }

    public function test_uses_most_recent_rate_for_model(): void
    {
        AiModelRate::create([
            'provider' => 'openai', 'model' => 'gpt-4o',
            'input_cost_per_million' => 5.0, 'output_cost_per_million' => 15.0,
            'effective_from' => '2025-01-01',
        ]);
        AiModelRate::create([
            'provider' => 'openai', 'model' => 'gpt-4o',
            'input_cost_per_million' => 2.5, 'output_cost_per_million' => 10.0,
            'effective_from' => '2026-01-01',
        ]);

        AiUsageLogger::log(
            user: null, provider: 'openai', model: 'gpt-4o',
            feature: 'ai_suggest', inputTokens: 1_000_000, outputTokens: 1_000_000,
        );

        // Should use the 2026 rate (2.5 + 10.0 = 12.5)
        $this->assertEqualsWithDelta(12.5, AiUsageLog::first()->cost_usd, 0.0001);
    }
}
