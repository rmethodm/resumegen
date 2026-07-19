<?php

namespace Tests\Feature;

use App\Models\AiRequest;
use App\Models\User;
use App\Services\AiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class AiProviderTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Moderation always runs through OpenAI, even when the chat call goes to
     * Anthropic — so every test here still needs a fake OpenAI client.
     */
    private function fakeModerationPasses(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
        ]));
    }

    private function fakeAnthropic(array $body): void
    {
        Http::fake(['api.anthropic.com/*' => Http::response($body)]);
    }

    /**
     * Anthropic reports usage under different keys than OpenAI. If that mapping
     * drifts, cost accounting silently reads zero and the monthly cap stops
     * reflecting real spend — so assert the logged row, not just the reply.
     */
    public function test_anthropic_reply_and_token_usage_are_logged(): void
    {
        $this->fakeModerationPasses();
        $this->fakeAnthropic([
            'content' => [['type' => 'text', 'text' => 'Shipped the thing.']],
            'usage' => ['input_tokens' => 12, 'output_tokens' => 7],
        ]);
        $user = User::factory()->create();

        $reply = app(AiService::class)->chat('Rewrite this bullet.', [
            'provider' => 'anthropic',
            'user' => $user,
            'feature' => 'rewrite_bullet',
        ]);

        $this->assertSame('Shipped the thing.', $reply);

        $row = AiRequest::sole();
        $this->assertSame('success', $row->status);
        $this->assertSame(config('ai.anthropic_model'), $row->model);
        $this->assertSame(12, $row->prompt_tokens);
        $this->assertSame(7, $row->completion_tokens);
        $this->assertSame(19, $row->total_tokens);
    }

    /**
     * Anthropic has no response_format, so JSON mode is faked by prefilling the
     * assistant turn with "{". The opening brace must come back on the reply or
     * every json_decode downstream fails.
     */
    public function test_json_mode_prefills_and_restores_the_opening_brace(): void
    {
        $this->fakeModerationPasses();
        $this->fakeAnthropic([
            'content' => [['type' => 'text', 'text' => '"title": "Engineer"}']],
            'usage' => ['input_tokens' => 1, 'output_tokens' => 1],
        ]);

        $reply = app(AiService::class)->chat('Extract the posting.', [
            'provider' => 'anthropic',
            'response_format' => ['type' => 'json_object'],
        ]);

        $this->assertSame(['title' => 'Engineer'], json_decode($reply, true));

        Http::assertSent(function ($request) {
            $messages = $request->data()['messages'];

            return end($messages) === ['role' => 'assistant', 'content' => '{'];
        });
    }

    /**
     * A provider outage must still leave an audit trail. Without the error row,
     * a broken key looks identical to nobody using the feature.
     */
    public function test_anthropic_failure_logs_an_error_row_and_rethrows(): void
    {
        $this->fakeModerationPasses();
        Http::fake(['api.anthropic.com/*' => Http::response('nope', 500)]);

        $this->expectException(RequestException::class);

        try {
            app(AiService::class)->chat('Anything.', ['provider' => 'anthropic']);
        } finally {
            $this->assertSame('error', AiRequest::sole()->status);
        }
    }

    /**
     * The provider config drives the default. Flipping AI_PROVIDER must reroute
     * existing features without touching any call site.
     */
    public function test_config_provider_selects_anthropic_without_an_explicit_option(): void
    {
        config()->set('ai.provider', 'anthropic');
        $this->fakeModerationPasses();
        $this->fakeAnthropic([
            'content' => [['type' => 'text', 'text' => 'ok']],
            'usage' => ['input_tokens' => 1, 'output_tokens' => 1],
        ]);

        $this->assertSame('ok', app(AiService::class)->chat('Hi.'));
        Http::assertSentCount(1);
    }
}
