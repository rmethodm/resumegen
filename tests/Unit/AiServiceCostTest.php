<?php

namespace Tests\Unit;

use App\Services\AiService;
use Tests\TestCase;

class AiServiceCostTest extends TestCase
{
    public function test_gpt_4o_mini_cost_is_computed_from_pinned_rates(): void
    {
        // 1000 prompt + 1000 completion tokens = 15000 + 60000 micro-cents.
        $this->assertSame(75000, AiService::costMicroCents('gpt-4o-mini', 1000, 1000));
    }

    public function test_gpt_4o_cost_is_computed_from_pinned_rates(): void
    {
        // 1000 prompt + 1000 completion tokens = 250000 + 1000000 micro-cents.
        $this->assertSame(1250000, AiService::costMicroCents('gpt-4o', 1000, 1000));
    }

    public function test_unknown_model_costs_zero(): void
    {
        $this->assertSame(0, AiService::costMicroCents('some-future-model', 1000, 1000));
    }

    public function test_zero_tokens_costs_zero(): void
    {
        $this->assertSame(0, AiService::costMicroCents('gpt-4o-mini', 0, 0));
    }
}
