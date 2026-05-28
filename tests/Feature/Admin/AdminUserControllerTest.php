<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_is_pro_returns_true_when_is_pro_flag_set(): void
    {
        $user = User::factory()->create(['is_pro' => true]);

        $this->assertTrue($user->isPro());
    }

    public function test_is_pro_returns_false_when_neither_flag_nor_subscription(): void
    {
        $user = User::factory()->create(['is_pro' => false]);

        $this->assertFalse($user->isPro());
    }
}
