<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserLimitsTest extends TestCase
{
    use RefreshDatabase;

    public function test_view_strength_detail_gate_by_tier(): void
    {
        $this->assertFalse(UserLimits::canViewStrengthDetail(User::factory()->free()->create()));
        $this->assertTrue(UserLimits::canViewStrengthDetail(User::factory()->starter()->create()));
        $this->assertTrue(UserLimits::canViewStrengthDetail(User::factory()->pro()->create()));
        $this->assertTrue(UserLimits::canViewStrengthDetail(User::factory()->agency()->create()));
    }
}
