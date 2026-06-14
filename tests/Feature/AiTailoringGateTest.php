<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use App\Services\AiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class AiTailoringGateTest extends TestCase
{
    use RefreshDatabase;

    public function test_free_user_is_blocked_from_ats_keywords(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('builder.ai.ats-keywords', $resume), ['job_description' => 'Senior PHP role'])
            ->assertStatus(402)
            ->assertJson(['required_tier' => 'starter']);
    }

    public function test_starter_user_reaches_the_ai_call(): void
    {
        $mock = Mockery::mock(AiService::class);
        $mock->shouldReceive('chat')->once()->andReturn('php, laravel, mysql');
        $this->app->instance(AiService::class, $mock);

        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('builder.ai.ats-keywords', $resume), ['job_description' => 'Senior PHP role'])
            ->assertOk()
            ->assertJsonStructure(['keywords', 'remaining']);
    }

    public function test_free_user_can_still_rewrite_a_bullet(): void
    {
        $mock = Mockery::mock(AiService::class);
        $mock->shouldReceive('chat')->once()->andReturn('Improved bullet.');
        $this->app->instance(AiService::class, $mock);

        $user = User::factory()->create(['plan_tier' => 'free']);
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('builder.ai.rewrite-bullet', $resume), ['text' => 'did stuff'])
            ->assertOk();
    }
}
