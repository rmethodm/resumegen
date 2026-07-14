<?php

namespace Tests\Feature;

use App\Exceptions\AiDisabledException;
use App\Models\Resume;
use App\Models\User;
use App\Services\AiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Contracts\ClientContract;
use OpenAI\Testing\ClientFake;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * AI is suspended in production via `ai.enabled`. These tests pin the two
 * guarantees that suspension has to make: nothing AI-backed is reachable over
 * HTTP, and nothing reaches the OpenAI client even from a non-HTTP caller.
 *
 * The suite otherwise runs with AI_ENABLED=true (see phpunit.xml) so the
 * feature code stays proven for whenever it is switched back on.
 */
class AiSuspendedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ai.enabled' => false]);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function aiRouteProvider(): array
    {
        return [
            'rewrite bullet' => ['builder.ai.rewrite-bullet'],
            'critique bullet' => ['builder.ai.critique-bullet'],
            'summary' => ['builder.ai.summary'],
            'ats keywords' => ['builder.ai.ats-keywords'],
            'interview coach' => ['builder.interview-coach'],
        ];
    }

    /**
     * 404, not 402/403: a suspended feature must not look like a paywall, or
     * the client will offer an upgrade that buys the user nothing.
     */
    #[DataProvider('aiRouteProvider')]
    public function test_resume_ai_route_is_gone_while_suspended(string $routeName): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post(route($routeName, $resume))
            ->assertNotFound();
    }

    /**
     * The route gate cannot protect queued jobs or console commands, so the
     * service itself must refuse before any request is built.
     */
    public function test_ai_service_refuses_to_call_openai_while_suspended(): void
    {
        $fake = new ClientFake;
        $this->app->instance(ClientContract::class, $fake);

        $this->expectException(AiDisabledException::class);

        try {
            app(AiService::class)->chat('anything');
        } finally {
            $fake->assertNothingSent();
        }
    }

    public function test_ai_is_not_advertised_to_the_frontend_while_suspended(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('aiEnabled', false));
    }
}
