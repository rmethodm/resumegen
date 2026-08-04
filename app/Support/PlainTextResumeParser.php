<?php

namespace App\Support;

/**
 * Best-effort plain-text / pasted resume → document shape.
 * Heuristic only — user reviews in the workstation. No AI.
 */
final class PlainTextResumeParser
{
    private const SECTION_ALIASES = [
        'summary' => ['summary', 'professional summary', 'profile', 'objective', 'about'],
        'experience' => ['experience', 'work experience', 'employment', 'professional experience', 'work history'],
        'education' => ['education', 'academic background'],
        'skills' => ['skills', 'technical skills', 'core skills', 'competencies'],
        'project' => ['projects', 'personal projects', 'selected projects'],
        'certificate' => ['certificates', 'certifications', 'licenses'],
    ];

    /**
     * @return array<string, mixed>
     */
    public static function parse(string $text): array
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", $text);
        $normalized = trim($normalized);

        $doc = [
            'title' => 'Imported resume',
            'target_role' => '',
            'headline' => '',
            'summary' => '',
            'full_name' => '',
            'email' => '',
            'phone' => '',
            'location' => '',
            'linkedin' => '',
            'website' => '',
            'experiences' => [],
            'education' => [],
            'skills' => [],
            'projects' => [],
            'certificates' => [],
        ];

        if ($normalized === '') {
            $doc['experiences'] = [self::emptyExperience()];

            return $doc;
        }

        $lines = array_values(array_filter(
            array_map(static fn (string $line): string => trim($line), explode("\n", $normalized)),
            static fn (string $line): bool => $line !== '',
        ));

        if ($lines === []) {
            $doc['experiences'] = [self::emptyExperience()];

            return $doc;
        }

        // Contact heuristics from the first few lines.
        $headerEnd = min(6, count($lines));
        for ($i = 0; $i < $headerEnd; $i++) {
            $line = $lines[$i];
            if ($doc['email'] === '' && preg_match('/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i', $line, $m) === 1) {
                $doc['email'] = $m[0];
            }
            if ($doc['phone'] === '' && preg_match('/(?:\+?\d[\d\s().-]{7,}\d)/', $line, $m) === 1) {
                $doc['phone'] = trim($m[0]);
            }
            if ($doc['linkedin'] === '' && stripos($line, 'linkedin.com') !== false) {
                $doc['linkedin'] = self::firstUrl($line) ?? $line;
            }
            if ($doc['website'] === '' && preg_match('#https?://#i', $line) === 1 && stripos($line, 'linkedin.com') === false) {
                $doc['website'] = self::firstUrl($line) ?? $line;
            }
        }

        // Name: first non-contact line that looks like a short proper name.
        foreach (array_slice($lines, 0, 4) as $line) {
            if (str_contains($line, '@') || preg_match('/\d{3}/', $line) === 1) {
                continue;
            }
            if (self::sectionKey($line) !== null) {
                continue;
            }
            if (mb_strlen($line) <= 60 && str_word_count($line) <= 5) {
                $doc['full_name'] = $line;
                break;
            }
        }

        // Headline: short line after name, before sections.
        if ($doc['full_name'] !== '') {
            $nameIndex = array_search($doc['full_name'], $lines, true);
            if (is_int($nameIndex) && isset($lines[$nameIndex + 1])) {
                $maybeHeadline = $lines[$nameIndex + 1];
                if (
                    self::sectionKey($maybeHeadline) === null
                    && ! str_contains($maybeHeadline, '@')
                    && mb_strlen($maybeHeadline) <= 80
                ) {
                    $doc['headline'] = $maybeHeadline;
                    $doc['target_role'] = $maybeHeadline;
                }
            }
        }

        $sections = self::splitSections($lines);
        foreach ($sections as $key => $bodyLines) {
            match ($key) {
                'summary' => $doc['summary'] = mb_substr(implode(' ', $bodyLines), 0, 2000),
                'experience' => $doc['experiences'] = self::parseExperiences($bodyLines),
                'education' => $doc['education'] = self::parseEducation($bodyLines),
                'skills' => $doc['skills'] = self::parseSkills($bodyLines),
                'project' => $doc['projects'] = self::parseProjects($bodyLines),
                'certificate' => $doc['certificates'] = self::parseCertificates($bodyLines),
                default => null,
            };
        }

        // Fallback: if no EXPERIENCE header, treat leftover non-header body as one blob summary.
        if ($doc['summary'] === '' && $doc['experiences'] === [] && count($lines) > 3) {
            $body = array_slice($lines, 1);
            $doc['summary'] = mb_substr(implode(' ', array_slice($body, 0, 8)), 0, 2000);
        }

        if ($doc['experiences'] === []) {
            $doc['experiences'] = [[
                'title' => '',
                'company' => '',
                'start_date' => '',
                'end_date' => '',
                'is_current' => false,
                'bullets' => [],
            ]];
        }

        return $doc;
    }

    /**
     * @param  list<string>  $lines
     * @return array<string, list<string>>
     */
    private static function splitSections(array $lines): array
    {
        $buckets = [];
        $current = null;

        foreach ($lines as $line) {
            $key = self::sectionKey($line);
            if ($key !== null) {
                $current = $key;
                $buckets[$current] ??= [];

                continue;
            }

            if ($current === null) {
                continue;
            }

            $buckets[$current][] = $line;
        }

        return $buckets;
    }

    private static function sectionKey(string $line): ?string
    {
        $clean = mb_strtolower(trim($line, " \t:-•"));
        $clean = preg_replace('/\s+/', ' ', $clean) ?? $clean;

        foreach (self::SECTION_ALIASES as $key => $aliases) {
            if (in_array($clean, $aliases, true)) {
                return $key;
            }
        }

        return null;
    }

    /**
     * @param  list<string>  $lines
     * @return list<array{title: string, company: string, start_date: string, end_date: string, is_current: bool, bullets: list<string>}>
     */
    private static function parseExperiences(array $lines): array
    {
        $entries = [];
        $current = null;

        foreach ($lines as $line) {
            if (self::isBullet($line)) {
                if ($current === null) {
                    $current = self::emptyExperience();
                }
                $current['bullets'][] = self::stripBullet($line);

                continue;
            }

            // Date-only lines attach to the open role instead of becoming a title.
            if (self::isDateLine($line)) {
                if ($current === null) {
                    $current = self::emptyExperience();
                }
                self::applyDates($current, $line);

                continue;
            }

            // New role line — flush previous.
            if ($current !== null) {
                $entries[] = $current;
            }
            $current = self::emptyExperience();
            [$title, $company] = self::splitTitleCompany($line);
            $current['title'] = $title;
            $current['company'] = $company;
            self::applyDates($current, $line);
        }

        if ($current !== null) {
            $entries[] = $current;
        }

        return array_values(array_filter(
            $entries,
            static fn (array $entry): bool => $entry['title'] !== '' || $entry['company'] !== '' || $entry['bullets'] !== [],
        ));
    }

    /**
     * @return array{title: string, company: string, start_date: string, end_date: string, is_current: bool, bullets: list<string>}
     */
    private static function emptyExperience(): array
    {
        return [
            'title' => '',
            'company' => '',
            'start_date' => '',
            'end_date' => '',
            'is_current' => false,
            'bullets' => [],
        ];
    }

    /**
     * @return array{0: string, 1: string}
     */
    private static function splitTitleCompany(string $line): array
    {
        $line = preg_replace('/\s+[|–—-]\s+\d{4}.*/', '', $line) ?? $line;
        foreach ([' — ', ' – ', ' - ', ' | ', ' @ ', ' at '] as $sep) {
            if (str_contains($line, $sep)) {
                [$left, $right] = explode($sep, $line, 2);

                return [trim($left), trim($right)];
            }
        }

        return [trim($line), ''];
    }

    /**
     * @param  list<string>  $lines
     * @return list<array{school: string, degree: string, field: string, graduation_year: string}>
     */
    private static function parseEducation(array $lines): array
    {
        $out = [];
        foreach ($lines as $line) {
            if (self::isBullet($line)) {
                $line = self::stripBullet($line);
            }
            $year = '';
            if (preg_match('/(19|20)\d{2}/', $line, $m) === 1) {
                $year = $m[0];
            }
            $out[] = [
                'school' => $line,
                'degree' => '',
                'field' => '',
                'graduation_year' => $year,
            ];
        }

        return $out;
    }

    /**
     * @param  list<string>  $lines
     * @return list<array{category: string, name: string}>
     */
    private static function parseSkills(array $lines): array
    {
        $blob = implode(', ', $lines);
        $parts = preg_split('/[,;|•·]+/', $blob) ?: [];
        $skills = [];
        foreach ($parts as $part) {
            $name = trim($part);
            $name = preg_replace('/^\d+[.)]\s*/', '', $name) ?? $name;
            if ($name === '' || mb_strlen($name) > 60) {
                continue;
            }
            $skills[] = ['category' => '', 'name' => $name];
        }

        return array_slice($skills, 0, 40);
    }

    /**
     * @param  list<string>  $lines
     * @return list<array{name: string, url: string, start_date: string, end_date: string, description: string, highlights: list<string>}>
     */
    private static function parseProjects(array $lines): array
    {
        $projects = [];
        $current = null;
        foreach ($lines as $line) {
            if (self::isBullet($line)) {
                if ($current === null) {
                    $current = [
                        'name' => 'Project',
                        'url' => '',
                        'start_date' => '',
                        'end_date' => '',
                        'description' => '',
                        'highlights' => [],
                    ];
                }
                $current['highlights'][] = self::stripBullet($line);

                continue;
            }
            if ($current !== null) {
                $projects[] = $current;
            }
            $current = [
                'name' => $line,
                'url' => self::firstUrl($line) ?? '',
                'start_date' => '',
                'end_date' => '',
                'description' => '',
                'highlights' => [],
            ];
        }
        if ($current !== null) {
            $projects[] = $current;
        }

        return $projects;
    }

    /**
     * @param  list<string>  $lines
     * @return list<array{name: string, issuer: string, obtained_at: string, expires_at: string, credential_id: string}>
     */
    private static function parseCertificates(array $lines): array
    {
        return array_map(
            static fn (string $line): array => [
                'name' => self::isBullet($line) ? self::stripBullet($line) : $line,
                'issuer' => '',
                'obtained_at' => '',
                'expires_at' => '',
                'credential_id' => '',
            ],
            $lines,
        );
    }

    private static function isBullet(string $line): bool
    {
        return (bool) preg_match('/^(?:[•\-\–\—*●▪]|\\d+[.)])\\s+/u', $line);
    }

    private static function stripBullet(string $line): string
    {
        return trim((string) preg_replace('/^(?:[•\-\–\—*●▪]|\\d+[.)])\\s+/u', '', $line));
    }

    private static function isDateLine(string $line): bool
    {
        // e.g. "2020 – Present", "Jan 2020 - Dec 2022"
        return (bool) preg_match(
            '/^(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(19|20)\d{2}\s*[–—\-to]+\s*(?:Present|Current|Now|(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:19|20)\d{2})$/iu',
            trim($line),
        );
    }

    /**
     * @param  array{title: string, company: string, start_date: string, end_date: string, is_current: bool, bullets: list<string>}  $entry
     */
    private static function applyDates(array &$entry, string $line): void
    {
        if (preg_match('/(20\d{2}|19\d{2}).{0,40}(present|current|now|20\d{2}|19\d{2})/i', $line, $m) !== 1) {
            return;
        }

        $entry['start_date'] = $m[1];
        $end = $m[2];
        if (preg_match('/present|current|now/i', $end) === 1) {
            $entry['is_current'] = true;
            $entry['end_date'] = '';
        } else {
            $entry['end_date'] = $end;
        }
    }

    private static function firstUrl(string $line): ?string
    {
        if (preg_match('#https?://\\S+#i', $line, $m) === 1) {
            return rtrim($m[0], '.,);');
        }

        return null;
    }
}
