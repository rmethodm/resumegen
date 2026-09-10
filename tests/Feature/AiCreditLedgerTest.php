<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AiCreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiCreditLedgerTest extends TestCase
{
    use RefreshDatabase;

    public function test_balance_is_sum_of_ledger_amounts(): void
    {
        $user = User::factory()->create();
        $credits = app(AiCreditService::class);
        $credits->grant($user, 20, 'starter');
        $credits->spend($user, 1, 'bullet_rewrite');
        $this->assertSame(19, $credits->balance($user));
    }

    public function test_starter_grant_is_idempotent(): void
    {
        $user = User::factory()->create();
        $credits = app(AiCreditService::class);
        $this->assertTrue($credits->grantStarterIfNeeded($user));
        $this->assertFalse($credits->grantStarterIfNeeded($user));
        $this->assertSame(config('ai.starter_credits'), $credits->balance($user));
    }
}
