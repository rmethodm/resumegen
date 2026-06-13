<?php

namespace Tests\Feature;

use App\Services\OpenAiUsageService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OpenAiUsageServiceTest extends TestCase
{
    public function test_returns_total_cents_from_costs_endpoint(): void
    {
        config()->set('ai.admin_key', 'sk-admin-test');
        Cache::flush();
        Http::fake([
            'api.openai.com/v1/organization/costs*' => Http::response([
                'data' => [
                    ['results' => [['amount' => ['value' => 1.23, 'currency' => 'usd']]]],
                    ['results' => [['amount' => ['value' => 0.77, 'currency' => 'usd']]]],
                ],
            ], 200),
        ]);

        $cents = app(OpenAiUsageService::class)->totalCostCents(now()->subDays(7), now());

        $this->assertSame(200, $cents); // (1.23 + 0.77) * 100
    }

    public function test_missing_admin_key_returns_null_without_calling_http(): void
    {
        config()->set('ai.admin_key', null);
        Http::fake(); // any call would record; we assert none happen

        $cents = app(OpenAiUsageService::class)->totalCostCents(now()->subDays(7), now());

        $this->assertNull($cents);
        Http::assertNothingSent();
    }

    public function test_http_failure_degrades_to_null(): void
    {
        config()->set('ai.admin_key', 'sk-admin-test');
        Cache::flush();
        Http::fake(['api.openai.com/*' => Http::response('nope', 500)]);

        $cents = app(OpenAiUsageService::class)->totalCostCents(now()->subDays(7), now());

        $this->assertNull($cents);
    }
}
