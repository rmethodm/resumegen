<?php

namespace Tests\Feature;

use App\Models\AiRequest;
use App\Models\User;
use App\Services\AiUsageReport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiUsageReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_overview_totals_for_period(): void
    {
        $user = User::factory()->create();
        AiRequest::factory()->for($user)->count(3)->create([
            'status' => 'success', 'total_tokens' => 10, 'estimated_cost_micro_cents' => 2_000_000,
            'created_at' => now()->subDays(1),
        ]);
        AiRequest::factory()->for($user)->create([
            'status' => 'flagged', 'total_tokens' => 0, 'created_at' => now()->subDays(1),
        ]);
        // Outside the 7d window — must be excluded.
        AiRequest::factory()->for($user)->create([
            'status' => 'success', 'estimated_cost_micro_cents' => 99_000_000,
            'created_at' => now()->subDays(40),
        ]);

        $report = new AiUsageReport;
        $totals = $report->totals('7d');

        $this->assertSame(4, $totals['requests']);          // 3 success + 1 flagged in window
        $this->assertSame(30, $totals['tokens']);
        $this->assertSame(6_000_000, $totals['cost_micro_cents']);
        $this->assertSame(1, $totals['flagged']);
        $this->assertSame(1, $totals['active_users']);
    }

    public function test_breakdown_groups_by_column(): void
    {
        $user = User::factory()->create();
        AiRequest::factory()->for($user)->count(2)->create(['feature' => 'summary', 'created_at' => now()]);
        AiRequest::factory()->for($user)->create(['feature' => 'rewrite_bullet', 'created_at' => now()]);

        $rows = (new AiUsageReport)->breakdown('feature', 'all');

        $this->assertSame('summary', $rows[0]['label']);    // ordered by count desc
        $this->assertSame(2, $rows[0]['count']);
    }
}
