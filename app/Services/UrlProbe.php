<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Soft reachability check for resume URL fields (LinkedIn, website, project).
 * SSRF posture: public http(s) only, no auto-redirects,
 * DNS pinned to the addresses that passed the private-IP guard.
 */
class UrlProbe
{
    /**
     * @return array{ok: bool, status: int|null, message: string|null, url: string|null}
     */
    public function check(string $raw): array
    {
        $url = $this->normalize($raw);

        if ($url === null) {
            return [
                'ok' => false,
                'status' => null,
                'message' => 'Enter a full URL, like https://example.com.',
                'url' => null,
            ];
        }

        try {
            $addresses = $this->assertPublicUrl($url);
            $response = $this->probe($url, $addresses, 'head');

            // Some hosts refuse HEAD; fall back to a short GET of the same URL.
            if ($response === null || in_array($response->status(), [405, 501], true)) {
                $response = $this->probe($url, $addresses, 'get');
            }

            if ($response === null) {
                return [
                    'ok' => false,
                    'status' => null,
                    'message' => 'We couldn\'t reach this URL. The site may be down.',
                    'url' => $url,
                ];
            }

            $status = $response->status();

            if ($status >= 200 && $status < 400) {
                return [
                    'ok' => true,
                    'status' => $status,
                    'message' => null,
                    'url' => $url,
                ];
            }

            return [
                'ok' => false,
                'status' => $status,
                'message' => "This URL doesn't look reachable right now (HTTP {$status}).",
                'url' => $url,
            ];
        } catch (RuntimeException $exception) {
            return [
                'ok' => false,
                'status' => null,
                'message' => $exception->getMessage(),
                'url' => $url,
            ];
        }
    }

    /**
     * Accept bare hosts ("example.com/path") by prefixing https://.
     */
    public function normalize(string $raw): ?string
    {
        $trimmed = trim($raw);

        if ($trimmed === '') {
            return null;
        }

        if (! preg_match('#^[a-z][a-z0-9+.-]*://#i', $trimmed)) {
            $trimmed = 'https://'.$trimmed;
        }

        if (filter_var($trimmed, FILTER_VALIDATE_URL) === false) {
            return null;
        }

        $scheme = parse_url($trimmed, PHP_URL_SCHEME);

        if (! in_array($scheme, ['http', 'https'], true)) {
            return null;
        }

        return $trimmed;
    }

    /**
     * @param  array<int, string>  $addresses
     */
    private function probe(string $url, array $addresses, string $method): ?Response
    {
        try {
            $pending = Http::timeout(5)
                ->connectTimeout(3)
                ->withHeaders(['User-Agent' => 'Mozilla/5.0 (compatible; ResumegenBot/1.0)'])
                ->withOptions([
                    'allow_redirects' => false,
                    'curl' => [CURLOPT_RESOLVE => [$this->curlResolveEntry($url, $addresses)]],
                ]);

            return $method === 'head' ? $pending->head($url) : $pending->get($url);
        } catch (ConnectionException) {
            return null;
        }
    }

    /**
     * @return array<int, string>
     */
    private function assertPublicUrl(string $url): array
    {
        $host = parse_url($url, PHP_URL_HOST);
        $scheme = parse_url($url, PHP_URL_SCHEME);

        if (! $host || ! in_array($scheme, ['http', 'https'], true)) {
            throw new RuntimeException('That does not look like a valid URL.');
        }

        $addresses = $this->resolve(trim($host, '[]'));

        if ($addresses === []) {
            throw new RuntimeException('We couldn\'t reach this URL. The host may not exist.');
        }

        foreach ($addresses as $ip) {
            if (! $this->isPublicIp($ip)) {
                throw new RuntimeException('That host is not reachable.');
            }
        }

        return $addresses;
    }

    /**
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
}
