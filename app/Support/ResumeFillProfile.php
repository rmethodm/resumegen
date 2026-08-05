<?php

namespace App\Support;

use App\Models\Education;
use App\Models\Experience;
use App\Models\Resume;
use App\Models\Skill;

/**
 * Stable JSON payload for the Resumegen Apply browser extension.
 *
 * Built from a resume row — not the full editor document — so field labels
 * in the side panel stay stable even if ResumeDocument grows.
 */
final class ResumeFillProfile
{
    public const TOKEN_NAME = 'Resumegen Apply';

    public const TOKEN_ABILITY = 'extension';

    /**
     * @return array<string, mixed>
     */
    public static function from(Resume $resume): array
    {
        $resume->loadMissing(['experiences', 'skills', 'education', 'group']);

        $fullName = trim((string) ($resume->full_name ?? ''));
        [$firstName, $lastName] = self::splitName($fullName);

        $experiences = $resume->experiences
            ->sortBy('position')
            ->values();

        /** @var Experience|null $latest */
        $latest = $experiences->first();

        $skills = $resume->skills
            ->sortBy('position')
            ->map(fn (Skill $skill): string => trim((string) $skill->name))
            ->filter()
            ->values()
            ->all();

        $skillsCsv = implode(', ', $skills);

        $latestRole = self::latestRolePayload($latest);
        $education = self::educationPayload(
            $resume->education->sortBy('position')->first()
        );

        $versionIndex = self::versionIndex($resume);

        return [
            'resume_id' => $resume->id,
            'group_id' => $resume->group_id,
            'group_title' => $resume->group?->title ?? $resume->title,
            'version_label' => 'v'.$versionIndex,
            'title' => $resume->title,
            'updated_at' => $resume->updated_at?->toIso8601String(),
            'target_role' => $resume->target_role ?? '',
            'contact' => [
                'full_name' => $fullName,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => trim((string) ($resume->email ?? '')),
                'phone' => trim((string) ($resume->phone ?? '')),
                'location' => trim((string) ($resume->location ?? '')),
                'linkedin' => trim((string) ($resume->linkedin ?? '')),
                'website' => trim((string) ($resume->website ?? '')),
            ],
            'summary' => trim((string) ($resume->summary ?? '')),
            'skills' => $skills,
            'skills_csv' => $skillsCsv,
            'latest_role' => $latestRole,
            'education' => $education,
            'experiences' => $experiences
                ->take(2)
                ->map(fn (Experience $experience): array => [
                    'title' => trim((string) ($experience->title ?? '')),
                    'company' => trim((string) ($experience->company ?? '')),
                    'start_date' => (string) ($experience->start_date ?? ''),
                    'end_date' => (string) ($experience->end_date ?? ''),
                    'is_current' => (bool) $experience->is_current,
                    'bullets' => array_values(array_filter(
                        array_map('strval', $experience->bullets ?? [])
                    )),
                ])
                ->all(),
            'inserts' => [
                'full_name' => $fullName,
                'email' => trim((string) ($resume->email ?? '')),
                'phone' => trim((string) ($resume->phone ?? '')),
                'linkedin' => trim((string) ($resume->linkedin ?? '')),
                'location' => trim((string) ($resume->location ?? '')),
                'summary' => trim((string) ($resume->summary ?? '')),
                'skills' => $skillsCsv,
                'latest_role' => $latestRole['one_liner'] ?? '',
                'latest_role_bullets' => $latestRole
                    ? implode("\n", array_map(
                        fn (string $b): string => '• '.$b,
                        $latestRole['bullets']
                    ))
                    : '',
            ],
        ];
    }

    /**
     * Group + version picker payload for the side panel.
     *
     * @return list<array<string, mixed>>
     */
    public static function groupsForUser(int $userId): array
    {
        $resumes = Resume::query()
            ->where('user_id', $userId)
            ->with('group:id,title')
            ->orderByDesc('updated_at')
            ->get(['id', 'group_id', 'title', 'full_name', 'target_role', 'updated_at']);

        $byGroup = [];

        foreach ($resumes as $resume) {
            $groupId = $resume->group_id ?? 0;
            $groupTitle = $resume->group?->title ?? $resume->title;

            if (! isset($byGroup[$groupId])) {
                $byGroup[$groupId] = [
                    'id' => $resume->group_id,
                    'title' => $groupTitle,
                    'versions' => [],
                ];
            }

            $byGroup[$groupId]['versions'][] = [
                'id' => $resume->id,
                'title' => $resume->title,
                'full_name' => $resume->full_name ?? '',
                'target_role' => $resume->target_role ?? '',
                'updated_at' => $resume->updated_at?->toIso8601String(),
            ];
        }

        // Label versions v1..vn in creation order (id ascending) per group.
        foreach ($byGroup as &$group) {
            usort($group['versions'], fn (array $a, array $b): int => $a['id'] <=> $b['id']);
            foreach ($group['versions'] as $i => &$version) {
                $version['version_label'] = 'v'.($i + 1);
            }
            unset($version);
            // Side panel default: most recently updated first within group.
            usort(
                $group['versions'],
                fn (array $a, array $b): int => strcmp($b['updated_at'] ?? '', $a['updated_at'] ?? '')
            );
        }
        unset($group);

        return array_values($byGroup);
    }

    /**
     * @return array{0: string, 1: string}
     */
    public static function splitName(string $fullName): array
    {
        $fullName = trim(preg_replace('/\s+/', ' ', $fullName) ?? '');

        if ($fullName === '') {
            return ['', ''];
        }

        $parts = explode(' ', $fullName, 2);

        return [$parts[0], $parts[1] ?? ''];
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function latestRolePayload(?Experience $experience): ?array
    {
        if ($experience === null) {
            return null;
        }

        $title = trim((string) ($experience->title ?? ''));
        $company = trim((string) ($experience->company ?? ''));
        $start = (string) ($experience->start_date ?? '');
        $end = $experience->is_current
            ? 'Present'
            : (string) ($experience->end_date ?? '');
        $bullets = array_values(array_filter(
            array_map('strval', $experience->bullets ?? [])
        ));

        $dates = trim($start.($end !== '' ? '–'.$end : ''));
        $oneLiner = trim(implode(' · ', array_filter([
            $title !== '' && $company !== '' ? "{$title} at {$company}" : ($title ?: $company),
            $dates !== '' ? $dates : null,
        ])));

        return [
            'title' => $title,
            'company' => $company,
            'start_date' => $start,
            'end_date' => (string) ($experience->end_date ?? ''),
            'is_current' => (bool) $experience->is_current,
            'one_liner' => $oneLiner,
            'bullets' => $bullets,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function educationPayload(?Education $education): ?array
    {
        if ($education === null) {
            return null;
        }

        $school = trim((string) ($education->school ?? ''));
        $degree = trim((string) ($education->degree ?? ''));
        $field = trim((string) ($education->field ?? ''));
        $year = (string) ($education->graduation_year ?? '');

        $oneLiner = trim(implode(' · ', array_filter([
            $degree !== '' && $field !== '' ? "{$degree} in {$field}" : ($degree ?: $field),
            $school,
            $year !== '' ? $year : null,
        ])));

        return [
            'school' => $school,
            'degree' => $degree,
            'field' => $field,
            'graduation_year' => $year,
            'one_liner' => $oneLiner,
        ];
    }

    private static function versionIndex(Resume $resume): int
    {
        if ($resume->group_id === null) {
            return 1;
        }

        $ids = Resume::query()
            ->where('group_id', $resume->group_id)
            ->orderBy('id')
            ->pluck('id')
            ->all();

        $pos = array_search($resume->id, $ids, true);

        return $pos === false ? 1 : $pos + 1;
    }
}
