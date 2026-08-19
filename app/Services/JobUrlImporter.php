<?php

namespace App\Services;

use App\Data\AiPrompts;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Reads a job posting off an arbitrary URL. This is the scraping path, but the
 * per-site knowledge lives in the model rather than in selectors we would have
 * to repair every time a board reskins.
 */
class JobUrlImporter
{
    /**
     * Roughly the useful text of a long posting. The prompt caps again at 12k;
     * this cap just keeps a hostile page from filling memory first.
     */
    private const MAX_CHARS = 40000;

    private const MAX_REDIRECTS = 3;

    public function __construct(private AiService $ai) {}

    /**
     * @return array<string, mixed>
     */
    public function import(string $url, ?User $user = null): array
    {
        $html = $this->fetch($url);

        $reply = $this->ai->chat(
            AiPrompts::build('import_job_posting', [
                'text' => $this->toText($html),
                'url' => $url,
            ]),
            [
                'user' => $user,
                'feature' => 'import_job_posting',
                'response_format' => ['type' => 'json_object'],
                'max_tokens' => 1500,
            ],
        );

        $parsed = json_decode($reply, true) ?: [];

        if (($parsed['title'] ?? null) === null) {
            throw new RuntimeException('No job posting found at that URL.');
        }

        return [
            'source' => 'url',
            'external_id' => sha1($url),
            'title' => (string) $parsed['title'],
            'company' => $parsed['company'] ?? null,
            'location' => $parsed['location'] ?? null,
            'url' => $url,
            'description' => $parsed['description'] ?? null,
            'salary_min' => isset($parsed['salary_min']) ? (int) $parsed['salary_min'] : null,
            'salary_max' => isset($parsed['salary_max']) ? (int) $parsed['salary_max'] : null,
            'posted_at' => null,
        ];
    }

    /**
     * Fetch the page, validating every hop. Redirects are not followed
     * automatically: a public URL that 302s to 169.254.169.254 would otherwise
     * walk straight past a one-time check of the original URL.
     */
    private function fetch(string $url): string
    {
        for ($hop = 0; $hop <= self::MAX_REDIRECTS; $hop++) {
            $addresses = $this->assertPublicUrl($url);

            $response = Http::timeout(10)
                ->withHeaders(['User-Agent' => 'Mozilla/5.0 (compatible; ResumegenBot/1.0)'])
                ->withOptions([
                    'allow_redirects' => false,
                    // Pin DNS to the addresses that passed the guard — a
                    // rebinding DNS server could otherwise swap in a private
                    // IP between the check and curl's own lookup.
                    'curl' => [CURLOPT_RESOLVE => [$this->curlResolveEntry($url, $addresses)]],
                ])
                ->get($url);

            if (! $response->redirect()) {
                return $response->throw()->body();
            }

            $location = $response->header('Location');

            if ($location === '') {
                throw new RuntimeException('Could not read that posting.');
            }

            // A relative Location resolves against the current URL, so rebuild an
            // absolute one before the next hop is validated.
            $url = str_contains($location, '://')
                ? $location
                : rtrim($url, '/').'/'.ltrim($location, '/');
        }

        throw new RuntimeException('That link redirects too many times.');
    }

    /**
     * The URL comes straight from a user, so it must not be usable to reach the
     * host's own network — cloud metadata endpoints and internal admin panels are
     * the usual targets. Returns the validated addresses so the fetch can pin
     * curl to exactly those.
     *
     * @return array<int, string>
     */
    private function assertPublicUrl(string $url): array
    {
        $host = parse_url($url, PHP_URL_HOST);
        $scheme = parse_url($url, PHP_URL_SCHEME);

        if (! $host || ! in_array($scheme, ['http', 'https'], true)) {
            throw new RuntimeException('That does not look like a job posting link.');
        }

        $addresses = $this->resolve(trim($host, '[]'));

        if ($addresses === []) {
            throw new RuntimeException('That host is not reachable.');
        }

        foreach ($addresses as $ip) {
            if (! $this->isPublicIp($ip)) {
                throw new RuntimeException('That host is not reachable.');
            }
        }

        return $addresses;
    }

    /**
     * CURLOPT_RESOLVE entry ("host:port:ip1,ip2") pinning the validated
     * addresses, so curl never does its own — possibly rebound — lookup.
     *
     * @param  array<int, string>  $addresses
     */
    private function curlResolveEntry(string $url, array $addresses): string
    {
        $host = trim((string) parse_url($url, PHP_URL_HOST), '[]');
        $port = parse_url($url, PHP_URL_PORT)
            ?: (parse_url($url, PHP_URL_SCHEME) === 'https' ? 443 : 80);

        return "{$host}:{$port}:".implode(',', $addresses);
    }

    /**
     * Resolve both A and AAAA. Resolving only A would let a hostname with an
     * AAAA record pointing at ::1 through untouched.
     *
     * @return array<int, string>
     */
    private function resolve(string $host): array
    {
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return [$host];
        }

        $records = @dns_get_record($host, DNS_A | DNS_AAAA) ?: [];

        return array_values(array_filter(array_map(
            fn (array $record): ?string => $record['ip'] ?? $record['ipv6'] ?? null,
            $records,
        )));
    }

    /**
     * filter_var's private/reserved flags cover RFC1918, loopback, link-local and
     * IPv6 unique-local. IPv4-mapped IPv6 (::ffff:127.0.0.1) slips past them, so
     * unwrap it and re-check the embedded address.
     */
    private function isPublicIp(string $ip): bool
    {
        if (stripos($ip, '::ffff:') === 0) {
            $mapped = substr($ip, 7);

            if (filter_var($mapped, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                return $this->isPublicIp($mapped);
            }
        }

        return (bool) filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    }

    /**
     * Strip a page down to readable text. Script and style bodies are removed
     * first — strip_tags would otherwise leave their contents inline.
     */
    private function toText(string $html): string
    {
        $stripped = preg_replace('#<(script|style|noscript)\b[^>]*>.*?</\1>#is', ' ', $html) ?? $html;
        $text = html_entity_decode(strip_tags($stripped), ENT_QUOTES | ENT_HTML5);

        return trim(mb_substr(preg_replace('/\s+/u', ' ', $text) ?? '', 0, self::MAX_CHARS));
    }
}
