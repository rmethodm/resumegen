<?php

namespace App\Support;

use App\Models\Certificate;
use App\Models\Education;
use App\Models\Experience;
use App\Models\Project;
use App\Models\Resume;
use App\Models\Skill;
use Illuminate\Support\Facades\DB;

/**
 * The one place that knows the shape of a resume on the wire.
 *
 * Both builders (the two-pane editor and the workstation) render from
 * {@see toArray} and save through {@see save}, so a section only has to be
 * taught once. Adding a section means touching this file, the validation
 * rules, and the preview — nothing else.
 */
final class ResumeDocument
{
    /**
     * The full built-in template catalogue: the original 6 hand-designed
     * looks, then the 18 converted from the "PDF Resume Templates" design
     * doc (single/matrix-engine only — see the 2026-07-26 design spec for
     * why sidebar/band templates were dropped).
     *
     * @var list<string>
     */
    public const TEMPLATES = [
        'minimal', 'modern', 'classic', 'executive', 'ats', 'skills-first',
        'reverse-chronological', 'ats-plain', 'minimalist', 'engineering',
        'ivy-serif', 'clinical', 'career-change', 'entry-level',
        'metric-cards', 'sales-quota-table', 'federal', 'academic-cv',
        'accent-rule', 'consulting-ledger', 'education', 'startup-one-pager',
        'it-competency-matrix', 'centered-traditional',
    ];

    /**
     * Selectable body fonts. Kept in sync with the `fontFamily` map in
     * resume-preview.tsx and the `ResumeFont` union in types/resume.ts — a
     * value accepted here but missing there renders as the browser default.
     *
     * @var list<string>
     */
    public const FONTS = [
        'inter', 'arial', 'calibri', 'open-sans', 'lato', 'roboto',
        'montserrat', 'georgia', 'garamond', 'cambria', 'times',
        'ibm-plex-sans', 'work-sans', 'eb-garamond', 'ibm-plex-mono',
        'libre-baskerville', 'source-serif-4', 'figtree',
    ];

    /**
     * @return array<string, mixed>
     */
    public static function toArray(Resume $resume): array
    {
        $resume->loadMissing([
            'experiences', 'skills', 'projects', 'education', 'certificates',
        ]);

        return [
            'id' => $resume->id,
            'title' => $resume->title,
            'target_role' => $resume->target_role ?? '',
            'target_company' => $resume->target_company ?? '',
            'target_job_description' => $resume->target_job_description ?? '',

            'full_name' => $resume->full_name,
            'headline' => $resume->headline,
            'email' => $resume->email,
            'phone' => $resume->phone,
            'location' => $resume->location,
            'linkedin' => $resume->linkedin,
            'website' => $resume->website,
            'summary' => $resume->summary,

            'template' => $resume->template,
            'font' => $resume->font,
            'density' => $resume->density,
            'skills_layout' => $resume->skills_layout,
            'bullet_style' => $resume->bullet_style,
            'section_order' => $resume->sectionOrder(),

            'experiences' => $resume->experiences
                ->map(fn (Experience $experience): array => [
                    'title' => $experience->title,
                    'company' => $experience->company,
                    'start_date' => $experience->start_date,
                    'end_date' => $experience->end_date,
                    'is_current' => $experience->is_current,
                    'bullets' => $experience->bullets ?? [],
                ])->all(),

            'projects' => $resume->projects
                ->map(fn (Project $project): array => [
                    'name' => $project->name,
                    'url' => $project->url,
                    'start_date' => $project->start_date,
                    'end_date' => $project->end_date,
                    'description' => $project->description,
                    'highlights' => $project->highlights ?? [],
                ])->all(),

            'education' => $resume->education
                ->map(fn (Education $education): array => [
                    'school' => $education->school,
                    'degree' => $education->degree,
                    'field' => $education->field,
                    'graduation_year' => $education->graduation_year,
                ])->all(),

            'certificates' => $resume->certificates
                ->map(fn (Certificate $certificate): array => [
                    'name' => $certificate->name,
                    'issuer' => $certificate->issuer,
                    'obtained_at' => $certificate->obtained_at,
                    'expires_at' => $certificate->expires_at,
                    'credential_id' => $certificate->credential_id,
                ])->all(),

            'skills' => $resume->skills
                ->map(fn (Skill $skill): array => [
                    'category' => $skill->category,
                    'name' => $skill->name,
                ])->all(),
        ];
    }

    /**
     * ponytail: every save posts the whole document, so the children are
     * replaced wholesale rather than diffed. Row ids are not stable across
     * saves — fine until something needs to reference a single bullet.
     *
     * @param  array<string, mixed>  $data
     */
    public static function save(Resume $resume, array $data): void
    {
        DB::transaction(function () use ($data, $resume): void {
            $attributes = [
                'title' => $data['title'],
                'target_role' => $data['target_role'] ?? '',
                'target_company' => $data['target_company'] ?? null,
                'target_job_description' => $data['target_job_description'] ?? null,
                'full_name' => $data['full_name'] ?? '',
                'headline' => $data['headline'] ?? '',
                'email' => $data['email'] ?? '',
                'phone' => $data['phone'] ?? '',
                'location' => $data['location'] ?? '',
                'linkedin' => $data['linkedin'] ?? '',
                'website' => $data['website'] ?? '',
                'summary' => $data['summary'] ?? '',
                'template' => $data['template'] ?? 'minimal',
                'font' => $data['font'] ?? 'sans',
                'density' => $data['density'] ?? 'balanced',
                'skills_layout' => $data['skills_layout'] ?? 'inline',
                'bullet_style' => $data['bullet_style'] ?? 'bullet',
                'section_order' => $data['section_order'] ?? null,
            ];

            // `is_public` and `public_slug` are deliberately absent. They are
            // publication metadata, not part of the document — this method
            // rewrites the whole document on every save, and import and undo
            // both route through it, so a resume's shared state must not be
            // reachable from here. It is updated on its own endpoint instead.
            $resume->update($attributes);

            $resume->experiences()->delete();
            $resume->projects()->delete();
            $resume->education()->delete();
            $resume->certificates()->delete();
            $resume->skills()->delete();

            foreach (array_values($data['experiences'] ?? []) as $index => $experience) {
                $resume->experiences()->create([
                    'position' => $index,
                    'title' => $experience['title'] ?? '',
                    'company' => $experience['company'] ?? '',
                    'start_date' => $experience['start_date'] ?? '',
                    // A current role has no end date to store, whatever the
                    // form last had in that box.
                    'end_date' => ($experience['is_current'] ?? false)
                        ? ''
                        : ($experience['end_date'] ?? ''),
                    'is_current' => (bool) ($experience['is_current'] ?? false),
                    'bullets' => self::lines($experience['bullets'] ?? []),
                ]);
            }

            foreach (array_values($data['projects'] ?? []) as $index => $project) {
                $resume->projects()->create([
                    'position' => $index,
                    'name' => $project['name'] ?? '',
                    'url' => $project['url'] ?? '',
                    'start_date' => $project['start_date'] ?? '',
                    'end_date' => $project['end_date'] ?? '',
                    'description' => $project['description'] ?? '',
                    'highlights' => self::lines($project['highlights'] ?? []),
                ]);
            }

            foreach (array_values($data['education'] ?? []) as $index => $education) {
                $resume->education()->create([
                    'position' => $index,
                    'school' => $education['school'] ?? '',
                    'degree' => $education['degree'] ?? '',
                    'field' => $education['field'] ?? '',
                    'graduation_year' => $education['graduation_year'] ?? '',
                ]);
            }

            foreach (array_values($data['certificates'] ?? []) as $index => $certificate) {
                $resume->certificates()->create([
                    'position' => $index,
                    'name' => $certificate['name'] ?? '',
                    'issuer' => $certificate['issuer'] ?? '',
                    'obtained_at' => $certificate['obtained_at'] ?? '',
                    'expires_at' => $certificate['expires_at'] ?? '',
                    'credential_id' => $certificate['credential_id'] ?? '',
                ]);
            }

            foreach (array_values($data['skills'] ?? []) as $index => $skill) {
                $resume->skills()->create([
                    'position' => $index,
                    'category' => $skill['category'] ?? '',
                    'name' => $skill['name'],
                ]);
            }
        });
    }

    /**
     * Drop the blanks out of a bullet/highlight list and reindex it.
     *
     * @param  array<mixed>  $lines
     * @return list<string>
     */
    private static function lines(array $lines): array
    {
        return array_values(array_filter(
            $lines,
            fn (mixed $line): bool => is_string($line) && trim($line) !== '',
        ));
    }
}
