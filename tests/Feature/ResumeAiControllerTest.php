<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ResumeAiControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_status_reports_disabled_when_flag_off(): void
    {
        config([
            'ai.enabled' => false,
            'ai.openai.api_key' => null,
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson(route('ai.status'))
            ->assertOk()
            ->assertJsonPath('enabled', false);
    }

    public function test_rewrite_returns_503_when_ai_disabled(): void
    {
        config([
            'ai.enabled' => false,
            'ai.openai.api_key' => null,
        ]);

        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('resumes.ai.rewrite-bullet', $resume), [
                'bullet' => 'Responsible for managing the team.',
            ])
            ->assertStatus(503);
    }

    public function test_rewrite_returns_options_when_enabled(): void
    {
        config([
            'ai.enabled' => true,
            'ai.openai.api_key' => 'test-key',
            'ai.openai.base_url' => 'https://api.openai.test/v1',
            'ai.openai.model' => 'gpt-4o-mini',
            'ai.quotas.bullet_rewrite' => 5,
        ]);

        Http::fake([
            'api.openai.test/*' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => json_encode([
                            'options' => [
                                'Managed a cross-functional team of 8.',
                                'Led team delivery for quarterly releases.',
                            ],
                        ]),
                    ],
                ]],
            ], 200),
        ]);

        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'target_role' => 'Engineering Manager',
        ]);

        $this->actingAs($user)
            ->postJson(route('resumes.ai.rewrite-bullet', $resume), [
                'bullet' => 'Responsible for managing the team.',
            ])
            ->assertOk()
            ->assertJsonPath('options.0', 'Managed a cross-functional team of 8.')
            ->assertJsonPath('remaining', 4);
    }

    public function test_rewrite_enforces_monthly_quota(): void
    {
        config([
            'ai.enabled' => true,
            'ai.openai.api_key' => 'test-key',
            'ai.openai.base_url' => 'https://api.openai.test/v1',
            'ai.quotas.bullet_rewrite' => 1,
        ]);

        Http::fake([
            'api.openai.test/*' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => '{"options":["Owned delivery for the platform team."]}',
                    ],
                ]],
            ], 200),
        ]);

        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('resumes.ai.rewrite-bullet', $resume), [
                'bullet' => 'Worked on platform.',
            ])
            ->assertOk();

        $this->actingAs($user)
            ->postJson(route('resumes.ai.rewrite-bullet', $resume), [
                'bullet' => 'Worked on platform again.',
            ])
            ->assertStatus(429);
    }

    public function test_cannot_rewrite_another_users_resume(): void
    {
        config([
            'ai.enabled' => true,
            'ai.openai.api_key' => 'test-key',
        ]);

        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();

        $this->actingAs($other)
            ->postJson(route('resumes.ai.rewrite-bullet', $resume), [
                'bullet' => 'Did things.',
            ])
            ->assertNotFound();
    }
}
