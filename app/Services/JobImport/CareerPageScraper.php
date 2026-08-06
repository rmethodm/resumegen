<?php

namespace App\Services\JobImport;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CareerPageScraper
{
    /**
     * @return array{source: string, external_id: string, title: string, company: ?string, location: ?string, url: ?string, salary: ?string, description: ?string, posted_at: ?string}|null
     */
    public function fetch(string $url): ?array
    {
        if (! $this->allowedByRobots($url)) {
            return null;
        }

        $response = Http::timeout(6)->retry(2, 200, throw: false)->get($url);

        if (! $response->successful()) {
            Log::warning('career page fetch failed', ['url' => $url, 'status' => $response->status()]);

            return null;
        }

        $posting = $this->extractJobPosting($response->body());

        if ($posting === null) {
            return null;
        }

        return [
            'source' => 'career_page',
            'external_id' => (string) ($posting['identifier']['value'] ?? md5($url)),
            'title' => $posting['title'] ?? 'Untitled role',
            'company' => $posting['hiringOrganization']['name'] ?? null,
            'location' => $this->extractLocation($posting),
            'url' => $posting['url'] ?? $url,
            'salary' => $this->extractSalary($posting),
            'description' => isset($posting['description']) ? strip_tags((string) $posting['description']) : null,
            'posted_at' => $posting['datePosted'] ?? null,
        ];
    }

    /**
     * Heuristic robots.txt check — honors a blanket "Disallow: /" or an
     * exact/prefix path match under "User-agent: *". Not a full parser.
     */
    private function allowedByRobots(string $url): bool
    {
        $parts = parse_url($url);

        if (! isset($parts['scheme'], $parts['host'])) {
            return false;
        }

        $path = $parts['path'] ?? '/';
        $origin = "{$parts['scheme']}://{$parts['host']}";

        $response = Http::timeout(4)->get("{$origin}/robots.txt");

        if (! $response->successful()) {
            return true;
        }

        $inWildcardBlock = false;

        foreach (preg_split('/\R/', $response->body()) as $line) {
            $line = trim($line);

            if (stripos($line, 'user-agent:') === 0) {
                $inWildcardBlock = trim(substr($line, 11)) === '*';

                continue;
            }

            if ($inWildcardBlock && stripos($line, 'disallow:') === 0) {
                $disallowed = trim(substr($line, 9));

                if ($disallowed !== '' && str_starts_with($path, $disallowed)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function extractJobPosting(string $html): ?array
    {
        if (! preg_match_all('/<script[^>]*type=["\']application\/ld\+json["\'][^>]*>(.*?)<\/script>/is', $html, $matches)) {
            return null;
        }

        foreach ($matches[1] as $block) {
            $data = json_decode(trim($block), true);

            if (! is_array($data)) {
                continue;
            }

            foreach ($this->flattenJsonLd($data) as $node) {
                if (($node['@type'] ?? null) === 'JobPosting') {
                    return $node;
                }
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return list<array<string, mixed>>
     */
    private function flattenJsonLd(array $data): array
    {
        if (isset($data['@graph']) && is_array($data['@graph'])) {
            return $data['@graph'];
        }

        return [$data];
    }

    /**
     * @param  array<string, mixed>  $posting
     */
    private function extractLocation(array $posting): ?string
    {
        $address = $posting['jobLocation']['address'] ?? null;

        if (! is_array($address)) {
            return null;
        }

        return implode(', ', array_filter([
            $address['addressLocality'] ?? null,
            $address['addressRegion'] ?? null,
        ]));
    }

    /**
     * @param  array<string, mixed>  $posting
     */
    private function extractSalary(array $posting): ?string
    {
        $salary = $posting['baseSalary']['value'] ?? null;

        if (! is_array($salary)) {
            return null;
        }

        $currency = $posting['baseSalary']['currency'] ?? '';
        $min = $salary['minValue'] ?? null;
        $max = $salary['maxValue'] ?? null;

        if (! $min && ! $max) {
            return null;
        }

        return trim("{$currency} ".($min && $max ? "{$min}-{$max}" : (string) ($min ?? $max)));
    }
}
