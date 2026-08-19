<?php

namespace Tests\Feature;

use App\Services\JobUrlImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class JobUrlImporterTest extends TestCase
{
    use RefreshDatabase;

    private function fakeExtraction(array $parsed): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => json_encode($parsed)]]],
                'usage' => ['prompt_tokens' => 5, 'completion_tokens' => 5, 'total_tokens' => 10],
            ]),
        ]));
    }

    /**
     * A public IP literal rather than a hostname: the guard short-circuits DNS
     * for literals, so these tests never depend on a real resolver.
     */
    private const PUBLIC_URL = 'https://93.184.216.34/jobs/1';

    public function test_it_extracts_a_posting_from_page_html(): void
    {
        Http::fake(['*' => Http::response('<html><body><h1>Product Manager</h1></body></html>')]);
        $this->fakeExtraction([
            'title' => 'Product Manager',
            'company' => 'Acme',
            'location' => 'Denver, CO',
            'description' => 'Own the roadmap.',
            'salary_min' => 120000,
            'salary_max' => 150000,
        ]);

        $listing = app(JobUrlImporter::class)->import(self::PUBLIC_URL);

        $this->assertSame('Product Manager', $listing['title']);
        $this->assertSame('url', $listing['source']);
        $this->assertSame(120000, $listing['salary_min']);
    }

    /**
     * A page the model cannot read as a posting must fail loudly rather than
     * create a listing with a null title the user then has to puzzle over.
     */
    public function test_a_page_that_is_not_a_posting_is_rejected(): void
    {
        Http::fake(['*' => Http::response('<html><body>Cookie policy</body></html>')]);
        $this->fakeExtraction(['title' => null, 'company' => null]);

        $this->expectException(RuntimeException::class);

        app(JobUrlImporter::class)->import(self::PUBLIC_URL);
    }

    /**
     * The URL is user-supplied, so it is a direct route to anything the server
     * can reach — cloud metadata endpoints above all. These must never be fetched.
     */
    #[DataProvider('privateUrls')]
    public function test_private_and_reserved_addresses_are_refused(string $url): void
    {
        Http::fake();

        $this->expectException(RuntimeException::class);

        try {
            app(JobUrlImporter::class)->import($url);
        } finally {
            Http::assertNothingSent();
        }
    }

    public static function privateUrls(): array
    {
        return [
            'aws metadata' => ['http://169.254.169.254/latest/meta-data/'],
            'loopback v4' => ['http://127.0.0.1/admin'],
            'private range' => ['http://10.0.0.5/internal'],
            'link local' => ['http://192.168.1.1/'],
            'loopback v6' => ['http://[::1]/admin'],
            'ipv4-mapped v6' => ['http://[::ffff:127.0.0.1]/admin'],
            'unique local v6' => ['http://[fd00::1]/'],
            'non-http scheme' => ['file:///etc/passwd'],
        ];
    }

    /**
     * Validating only the URL the user typed is not enough: a public host can
     * 302 straight to the metadata endpoint. Every hop has to be re-checked.
     */
    public function test_a_redirect_into_a_private_address_is_refused(): void
    {
        Http::fake([
            '93.184.216.34/*' => Http::response('', 302, ['Location' => 'http://169.254.169.254/latest/meta-data/']),
            '169.254.169.254/*' => Http::response('SECRET'),
        ]);

        $this->expectException(RuntimeException::class);

        try {
            app(JobUrlImporter::class)->import(self::PUBLIC_URL);
        } finally {
            Http::assertNotSent(fn ($request) => str_contains($request->url(), '169.254.169.254'));
        }
    }

    /**
     * DNS-rebinding defense: curl must connect to exactly the addresses that
     * passed the guard, not re-resolve the host itself. The pin is a
     * CURLOPT_RESOLVE entry built from the validated IPs.
     */
    public function test_the_fetch_pins_curl_to_the_validated_addresses(): void
    {
        $method = new \ReflectionMethod(JobUrlImporter::class, 'curlResolveEntry');
        $importer = $this->app->make(JobUrlImporter::class);

        $this->assertSame(
            'example.com:443:93.184.216.34',
            $method->invoke($importer, 'https://example.com/jobs/1', ['93.184.216.34']),
        );
        $this->assertSame(
            'example.com:8080:93.184.216.34,2606:2800:220:1::1',
            $method->invoke($importer, 'http://example.com:8080/', ['93.184.216.34', '2606:2800:220:1::1']),
        );
    }

    /**
     * A redirect loop must terminate rather than hang the request.
     */
    public function test_a_redirect_loop_gives_up(): void
    {
        Http::fake([
            '93.184.216.34/*' => Http::response('', 302, ['Location' => 'https://93.184.216.34/again']),
        ]);

        $this->expectException(RuntimeException::class);

        app(JobUrlImporter::class)->import(self::PUBLIC_URL);
    }
}
