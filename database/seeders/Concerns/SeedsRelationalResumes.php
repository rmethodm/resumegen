<?php

namespace Database\Seeders\Concerns;

use App\Models\Resume;
use App\Models\ResumeGroup;
use App\Models\User;
use App\Support\ResumeDocument;

/**
 * Maps pre-rebuild fixture arrays (JSON columns on `resumes`, `name` as title)
 * onto the relational document shape expected by {@see ResumeDocument::save()}.
 */
trait SeedsRelationalResumes
{
    /**
     * @param  array<string, mixed>  $data
     */
    protected function saveLegacyResume(User $user, array $data): Resume
    {
        $title = (string) ($data['name'] ?? $data['title'] ?? 'Untitled');

        $resume = Resume::query()
            ->where('user_id', $user->id)
            ->where('title', $title)
            ->first();

        if ($resume === null) {
            $resume = $this->createResumeWithGroup($user, $title);
        } elseif ($resume->group_id === null) {
            $resume->group_id = $this->makeGroup($user, $title)->id;
            $resume->save();
        }

        ResumeDocument::save($resume, $this->legacyResumeToDocument($data));

        return $resume->refresh();
    }

    /**
     * Replace any existing resume with this title, then write the document.
     *
     * @param  array<string, mixed>  $data
     */
    protected function replaceLegacyResume(User $user, array $data): Resume
    {
        $title = (string) ($data['name'] ?? $data['title'] ?? 'Untitled');

        Resume::query()
            ->where('user_id', $user->id)
            ->where('title', $title)
            ->get()
            ->each
            ->delete();

        $resume = $this->createResumeWithGroup($user, $title);
        ResumeDocument::save($resume, $this->legacyResumeToDocument($data));

        return $resume->refresh();
    }

    /**
     * DatabaseSeeder uses WithoutModelEvents, so Resume::creating never assigns
     * a group — do the same work the model hook would have done.
     */
    private function createResumeWithGroup(User $user, string $title): Resume
    {
        return $user->resumes()->create([
            'title' => $title,
            'group_id' => $this->makeGroup($user, $title)->id,
        ]);
    }

    private function makeGroup(User $user, string $title): ResumeGroup
    {
        return ResumeGroup::create([
            'user_id' => $user->id,
            'title' => $title !== '' ? $title : 'Untitled resume',
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function legacyResumeToDocument(array $data): array
    {
        $contact = is_array($data['contact'] ?? null) ? $data['contact'] : [];
        $title = (string) ($data['name'] ?? $data['title'] ?? 'Untitled');

        return [
            'title' => $title,
            'target_role' => (string) ($data['target_role'] ?? $title),
            'target_company' => (string) ($data['target_company'] ?? ''),
            'target_job_description' => (string) ($data['target_job_description'] ?? ''),
            'full_name' => (string) ($contact['full_name'] ?? $data['full_name'] ?? 'Richard Method'),
            'headline' => (string) ($contact['headline'] ?? $data['headline'] ?? $title),
            'email' => (string) ($contact['email'] ?? $data['email'] ?? ''),
            'phone' => $this->formatPhone((string) ($contact['phone'] ?? $data['phone'] ?? '')),
            'location' => (string) ($contact['location'] ?? $data['location'] ?? ''),
            'linkedin' => $this->formatWebsite((string) ($contact['linkedin'] ?? $data['linkedin'] ?? '')),
            'website' => $this->formatWebsite((string) ($contact['website'] ?? $data['website'] ?? '')),
            'summary' => (string) ($data['summary'] ?? ''),
            'template' => (string) ($data['template'] ?? 'classic'),
            'font' => (string) ($data['font'] ?? 'inter'),
            'density' => (string) ($data['density'] ?? 'balanced'),
            'skills_layout' => (string) ($data['skills_layout'] ?? 'inline'),
            'bullet_style' => (string) ($data['bullet_style'] ?? 'bullet'),
            'section_order' => $data['section_order'] ?? null,
            'experiences' => $this->legacyExperiences($data['experience'] ?? $data['experiences'] ?? []),
            'projects' => $this->legacyProjects($data['projects'] ?? []),
            'education' => $this->legacyEducation($data['education'] ?? []),
            'certificates' => $this->legacyCertificates($data['certifications'] ?? $data['certificates'] ?? []),
            'skills' => $this->legacySkills($data['skills'] ?? []),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function legacyExperiences(mixed $rows): array
    {
        if (! is_array($rows)) {
            return [];
        }

        $out = [];

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $isCurrent = (bool) ($row['is_current'] ?? $row['current'] ?? false);
            $end = (string) ($row['end_date'] ?? '');

            if (strcasecmp($end, 'Present') === 0) {
                $isCurrent = true;
                $end = '';
            }

            $out[] = [
                'title' => (string) ($row['title'] ?? ''),
                'company' => (string) ($row['company'] ?? ''),
                'start_date' => (string) ($row['start_date'] ?? ''),
                'end_date' => $isCurrent ? '' : $end,
                'is_current' => $isCurrent,
                'bullets' => $this->legacyLines($row['bullets'] ?? []),
            ];
        }

        return $out;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function legacyProjects(mixed $rows): array
    {
        if (! is_array($rows)) {
            return [];
        }

        $out = [];

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $out[] = [
                'name' => (string) ($row['name'] ?? ''),
                'url' => $this->formatWebsite((string) ($row['url'] ?? '')),
                'start_date' => (string) ($row['start_date'] ?? ''),
                'end_date' => (string) ($row['end_date'] ?? ''),
                'description' => (string) ($row['description'] ?? ''),
                'highlights' => $this->legacyLines($row['highlights'] ?? $row['bullets'] ?? []),
            ];
        }

        return $out;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function legacyEducation(mixed $rows): array
    {
        if (! is_array($rows)) {
            return [];
        }

        $out = [];

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $out[] = [
                'school' => (string) ($row['school'] ?? ''),
                'degree' => (string) ($row['degree'] ?? ''),
                'field' => (string) ($row['field'] ?? ''),
                'graduation_year' => (string) ($row['graduation_year'] ?? $row['grad_year'] ?? ''),
            ];
        }

        return $out;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function legacyCertificates(mixed $rows): array
    {
        if (! is_array($rows)) {
            return [];
        }

        $out = [];

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $out[] = [
                'name' => (string) ($row['name'] ?? ''),
                'issuer' => (string) ($row['issuer'] ?? ''),
                'obtained_at' => (string) ($row['obtained_at'] ?? $row['date'] ?? ''),
                'expires_at' => (string) ($row['expires_at'] ?? $row['expiration'] ?? ''),
                'credential_id' => (string) ($row['credential_id'] ?? ''),
            ];
        }

        return $out;
    }

    /**
     * @return list<array{category: string, name: string}>
     */
    private function legacySkills(mixed $rows): array
    {
        if (! is_array($rows)) {
            return [];
        }

        $out = [];

        foreach ($rows as $row) {
            if (is_string($row) && trim($row) !== '') {
                $out[] = ['category' => '', 'name' => $row];

                continue;
            }

            if (is_array($row) && isset($row['name']) && is_string($row['name']) && $row['name'] !== '') {
                $out[] = [
                    'category' => (string) ($row['category'] ?? ''),
                    'name' => $row['name'],
                ];
            }
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    private function legacyLines(mixed $lines): array
    {
        if (is_string($lines)) {
            $parts = preg_split('/\r\n|\r|\n/', $lines) ?: [];

            return array_values(array_filter(
                array_map(static fn (string $line): string => trim($line), $parts),
                static fn (string $line): bool => $line !== '',
            ));
        }

        if (! is_array($lines)) {
            return [];
        }

        return array_values(array_filter(
            array_map(
                static fn (mixed $line): string => is_string($line) ? trim($line) : '',
                $lines,
            ),
            static fn (string $line): bool => $line !== '',
        ));
    }

    /**
     * Normalize to (xxx) xxx-xxxx. Accepts 7-digit (555-0101), 10-digit, or
     * 11-digit with a leading country code 1. Empty stays empty.
     */
    private function formatPhone(string $phone): string
    {
        $phone = trim($phone);

        if ($phone === '') {
            return '';
        }

        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (strlen($digits) === 11 && str_starts_with($digits, '1')) {
            $digits = substr($digits, 1);
        }

        // Fixture shorthand like 555-0101 → (555) 555-0101
        if (strlen($digits) === 7) {
            $digits = '555'.$digits;
        }

        if (strlen($digits) !== 10) {
            return $phone;
        }

        return sprintf(
            '(%s) %s-%s',
            substr($digits, 0, 3),
            substr($digits, 3, 3),
            substr($digits, 6, 4),
        );
    }

    /**
     * Ensure a non-empty website/url has an https:// scheme. Empty stays empty.
     */
    private function formatWebsite(string $website): string
    {
        $website = trim($website);

        if ($website === '') {
            return '';
        }

        if (preg_match('#^https?://#i', $website) === 1) {
            return (string) preg_replace('#^http://#i', 'https://', $website);
        }

        return 'https://'.$website;
    }
}
