<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserLimitsTest extends TestCase
{
    use RefreshDatabase;

    public function test_career_coach_gate_by_tier(): void
    {
        $this->assertFalse(UserLimits::canCareerCoach(User::factory()->free()->create()));
        $this->assertFalse(UserLimits::canCareerCoach(User::factory()->starter()->create()));
        $this->assertTrue(UserLimits::canCareerCoach(User::factory()->pro()->create()));
        $this->assertTrue(UserLimits::canCareerCoach(User::factory()->agency()->create()));
    }

    public function test_career_map_gate_by_tier(): void
    {
        $this->assertFalse(UserLimits::canCareerMap(User::factory()->free()->create()));
        $this->assertFalse(UserLimits::canCareerMap(User::factory()->starter()->create()));
        $this->assertTrue(UserLimits::canCareerMap(User::factory()->pro()->create()));
        $this->assertTrue(UserLimits::canCareerMap(User::factory()->agency()->create()));
    }
}
