<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class UrlCheckTest extends TestCase
{
    use RefreshDatabase;

    /** Public IP literal so tests never depend on live DNS. */
    private const PUBLIC_URL = 'https://93.184.216.34/portfolio';

    public function test_guests_cannot_check_urls(): void
    {
        $this->postJson(route('urls.check'), ['url' => self::PUBLIC_URL])
            ->assertUnauthorized();
    }

    public function test_a_live_2xx_url_is_ok(): void
    {
        Http::fake([
            self::PUBLIC_URL => Http::response('ok', 200),
        ]);

        $this->actingAs($this->user())
            ->postJson(route('urls.check'), ['url' => self::PUBLIC_URL])
            ->assertOk()
            ->assertJson([
                'ok' => true,
                'status' => 200,
                'message' => null,
            ]);
    }

    public function test_a_3xx_response_counts_as_up(): void
    {
        Http::fake([
            self::PUBLIC_URL => Http::response('', 302, ['Location' => 'https://example.com']),
        ]);

        $this->actingAs($this->user())
            ->postJson(route('urls.check'), ['url' => self::PUBLIC_URL])
            ->assertOk()
            ->assertJson([
                'ok' => true,
                'status' => 302,
            ]);
    }

    public function test_a_4xx_response_alerts_the_user(): void
    {
        Http::fake([
            self::PUBLIC_URL => Http::response('gone', 404),
        ]);

        $this->actingAs($this->user())
            ->postJson(route('urls.check'), ['url' => self::PUBLIC_URL])
            ->assertOk()
            ->assertJsonPath('ok', false)
            ->assertJsonPath('status', 404)
            ->assertJsonFragment(['message' => "This URL doesn't look reachable right now (HTTP 404)."]);
    }

    public function test_connection_failure_alerts_the_user(): void
    {
        Http::fake([
            self::PUBLIC_URL => fn () => throw new ConnectionException('timed out'),
        ]);

        $this->actingAs($this->user())
            ->postJson(route('urls.check'), ['url' => self::PUBLIC_URL])
            ->assertOk()
            ->assertJsonPath('ok', false)
            ->assertJsonPath('message', 'We couldn\'t reach this URL. The site may be down.');
    }

    public function test_bare_hosts_are_normalized_to_https(): void
    {
        Http::fake([
            'https://93.184.216.34/me' => Http::response('ok', 200),
        ]);

        $this->actingAs($this->user())
            ->postJson(route('urls.check'), ['url' => '93.184.216.34/me'])
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('url', 'https://93.184.216.34/me');
    }

    #[DataProvider('privateUrls')]
    public function test_private_and_reserved_addresses_are_refused(string $url): void
    {
        Http::fake();

        $response = $this->actingAs($this->user())
            ->postJson(route('urls.check'), ['url' => $url])
            ->assertOk();

        $this->assertFalse($response->json('ok'));
        Http::assertNothingSent();
    }

    public static function privateUrls(): array
    {
        return [
            'aws metadata' => ['http://169.254.169.254/latest/meta-data/'],
            'loopback v4' => ['http://127.0.0.1/admin'],
            'private range' => ['http://10.0.0.5/internal'],
            'non-http scheme' => ['file:///etc/passwd'],
        ];
    }

    private function user(): User
    {
        return User::factory()->create([
            'email_verified_at' => now(),
        ]);
    }
}
