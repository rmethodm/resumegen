<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Turns a {@see ResumeDocument} array into a flat, presentation-ready view the
 * exporters render — the PDF Blade and the DOCX builder both read this, so the
 * "which sections, in what order, with which entries and dates" logic lives
 * once rather than being re-derived (and drifting) in each.
 *
 * It deliberately mirrors resume-preview.tsx: same section titles, same
 * empty-section filtering, same date collapsing. Only the visual formatting
 * differs between the two exporters; the content decisions are made here.
 */
final class ResumeExport
{
    private const TITLES = [
        'summary' => 'Summary',
        'experience' => 'Work Experience',
        'project' => 'Projects',
        'education' => 'Education',
        'skills' => 'Skills',
        'certificate' => 'Certifications',
    ];

    /**
     * Ported by hand from the `templates` map in `resume-preview.tsx` — keep
     * the two in sync when a template's look changes there. Includes layout
     * flags (entry_style, skills_first, header bg, page accent) so templates
     * are more than accent colours. dompdf has no flexbox; table/border
     * chrome is used instead.
     *
     * @var array<string, array{header: array{align: string, name_size: string, name_upper: bool, name_color: string, name_tracking: string|null, sub_color: string, rule: string|null, bg: string|null}, heading: array{color: string, tracking: string, transform: string, weight: int, rule: string|null, bar: string|null}, page_accent: string|null, entry_style: string, skills_first: bool, skills_layout: string|null, name_weight: int}>
     */
    private const TEMPLATE_STYLES = [
        'minimal' => [
            'header' => ['align' => 'center', 'name_size' => '2em', 'name_upper' => false, 'name_color' => '#181818', 'name_tracking' => null, 'sub_color' => '#333', 'rule' => '2px solid #1f2933', 'bg' => null],
            'heading' => ['color' => '#444', 'tracking' => '0.22em', 'transform' => 'uppercase', 'weight' => 400, 'rule' => '1px solid #c8c8c8', 'bar' => null],
            'page_accent' => null, 'entry_style' => 'default', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 700,
        ],
        'modern' => [
            'header' => ['align' => 'left', 'name_size' => '2.2em', 'name_upper' => false, 'name_color' => '#312e81', 'name_tracking' => null, 'sub_color' => '#4338ca', 'rule' => null, 'bg' => '#eef2ff'],
            'heading' => ['color' => '#4f46e5', 'tracking' => '0.14em', 'transform' => 'uppercase', 'weight' => 700, 'rule' => '1px solid #c7d2fe', 'bar' => null],
            'page_accent' => '#4f46e5', 'entry_style' => 'stacked', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 700,
        ],
        'classic' => [
            'header' => ['align' => 'center', 'name_size' => '2.2em', 'name_upper' => false, 'name_color' => '#181818', 'name_tracking' => '0.08em', 'sub_color' => '#333', 'rule' => '3px double #181818', 'bg' => null],
            'heading' => ['color' => '#181818', 'tracking' => '0.18em', 'transform' => 'uppercase', 'weight' => 700, 'rule' => '1px solid #999', 'bar' => null],
            'page_accent' => null, 'entry_style' => 'ruled', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 700,
        ],
        'executive' => [
            'header' => ['align' => 'left', 'name_size' => '2.5em', 'name_upper' => true, 'name_color' => '#0f172a', 'name_tracking' => '0.02em', 'sub_color' => '#475569', 'rule' => '4px solid #0f172a', 'bg' => null],
            'heading' => ['color' => '#0f172a', 'tracking' => '0.16em', 'transform' => 'uppercase', 'weight' => 700, 'rule' => null, 'bar' => '#0f172a'],
            'page_accent' => '#0f172a', 'entry_style' => 'default', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 800,
        ],
        'ats' => [
            'header' => ['align' => 'left', 'name_size' => '1.9em', 'name_upper' => false, 'name_color' => '#000', 'name_tracking' => null, 'sub_color' => '#000', 'rule' => null, 'bg' => null],
            'heading' => ['color' => '#000', 'tracking' => '0.02em', 'transform' => 'uppercase', 'weight' => 700, 'rule' => null, 'bar' => null],
            'page_accent' => null, 'entry_style' => 'stacked', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 700,
        ],
        'skills-first' => [
            'header' => ['align' => 'center', 'name_size' => '2em', 'name_upper' => false, 'name_color' => '#047857', 'name_tracking' => null, 'sub_color' => '#444', 'rule' => '2px solid #059669', 'bg' => '#ecfdf5'],
            'heading' => ['color' => '#059669', 'tracking' => '0.16em', 'transform' => 'uppercase', 'weight' => 700, 'rule' => '1px solid #a7f3cd', 'bar' => null],
            'page_accent' => '#059669', 'entry_style' => 'default', 'skills_first' => true, 'skills_layout' => 'grouped', 'name_weight' => 700,
        ],
        'reverse-chronological' => [
            'header' => ['align' => 'left', 'name_size' => '2em', 'name_upper' => true, 'name_color' => '#111', 'name_tracking' => '0.02em', 'sub_color' => '#2b4570', 'rule' => '2px solid #2b4570', 'bg' => null],
            'heading' => ['color' => '#16161f', 'tracking' => '0.1em', 'transform' => 'uppercase', 'weight' => 700, 'rule' => '1.5px solid #2b4570', 'bar' => null],
            'page_accent' => null, 'entry_style' => 'ruled', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 700,
        ],
        'ats-plain' => [
            'header' => ['align' => 'left', 'name_size' => '2em', 'name_upper' => false, 'name_color' => '#111', 'name_tracking' => null, 'sub_color' => '#000000', 'rule' => null, 'bg' => null],
            'heading' => ['color' => '#16161f', 'tracking' => '0.01em', 'transform' => 'none', 'weight' => 700, 'rule' => '1.5px solid #bbbbbb', 'bar' => null],
            'page_accent' => null, 'entry_style' => 'stacked', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 700,
        ],
        'minimalist' => [
            'header' => ['align' => 'left', 'name_size' => '2.1em', 'name_upper' => false, 'name_color' => '#111', 'name_tracking' => null, 'sub_color' => '#71717a', 'rule' => null, 'bg' => null],
            'heading' => ['color' => '#a1a1aa', 'tracking' => '0.18em', 'transform' => 'uppercase', 'weight' => 500, 'rule' => null, 'bar' => null],
            'page_accent' => null, 'entry_style' => 'stacked', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 500,
        ],
        'engineering' => [
            'header' => ['align' => 'left', 'name_size' => '2em', 'name_upper' => false, 'name_color' => '#0f172a', 'name_tracking' => null, 'sub_color' => '#1e3a5f', 'rule' => '1px solid #1e3a5f', 'bg' => null],
            'heading' => ['color' => '#1e3a5f', 'tracking' => '0.01em', 'transform' => 'none', 'weight' => 700, 'rule' => null, 'bar' => '#1e3a5f'],
            'page_accent' => '#1e3a5f', 'entry_style' => 'default', 'skills_first' => false, 'skills_layout' => 'columns', 'name_weight' => 700,
        ],
        'ivy-serif' => [
            'header' => ['align' => 'center', 'name_size' => '2.15em', 'name_upper' => true, 'name_color' => '#111', 'name_tracking' => '0.06em', 'sub_color' => '#111111', 'rule' => '3px double #14161a', 'bg' => null],
            'heading' => ['color' => '#16161f', 'tracking' => '0.12em', 'transform' => 'uppercase', 'weight' => 700, 'rule' => '3px double #14161a', 'bar' => null],
            'page_accent' => null, 'entry_style' => 'ruled', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 600,
        ],
        'clinical' => [
            'header' => ['align' => 'left', 'name_size' => '2em', 'name_upper' => true, 'name_color' => '#0e5b5b', 'name_tracking' => '0.02em', 'sub_color' => '#0e5b5b', 'rule' => '2px solid #0e5b5b', 'bg' => '#f0fdfa'],
            'heading' => ['color' => '#0e5b5b', 'tracking' => '0.1em', 'transform' => 'uppercase', 'weight' => 700, 'rule' => '2px solid #0e5b5b', 'bar' => null],
            'page_accent' => null, 'entry_style' => 'stacked', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 700,
        ],
        'career-change' => [
            'header' => ['align' => 'left', 'name_size' => '2em', 'name_upper' => false, 'name_color' => '#312e81', 'name_tracking' => null, 'sub_color' => '#4338ca', 'rule' => '2px solid #4338ca', 'bg' => null],
            'heading' => ['color' => '#4338ca', 'tracking' => '0.01em', 'transform' => 'none', 'weight' => 700, 'rule' => null, 'bar' => '#4338ca'],
            'page_accent' => null, 'entry_style' => 'cards', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 700,
        ],
        'entry-level' => [
            'header' => ['align' => 'left', 'name_size' => '2.1em', 'name_upper' => false, 'name_color' => '#312e81', 'name_tracking' => null, 'sub_color' => '#3730a3', 'rule' => null, 'bg' => '#eef2ff'],
            'heading' => ['color' => '#3730a3', 'tracking' => '0.01em', 'transform' => 'none', 'weight' => 700, 'rule' => '1.5px solid #c7d2fe', 'bar' => null],
            'page_accent' => null, 'entry_style' => 'cards', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 700,
        ],
        'metric-cards' => [
            'header' => ['align' => 'left', 'name_size' => '2em', 'name_upper' => false, 'name_color' => '#111', 'name_tracking' => null, 'sub_color' => '#4f46e5', 'rule' => '2px solid #4f46e5', 'bg' => null],
            'heading' => ['color' => '#4f46e5', 'tracking' => '0.01em', 'transform' => 'none', 'weight' => 700, 'rule' => '1.5px solid #c7d2fe', 'bar' => null],
            'page_accent' => '#4f46e5', 'entry_style' => 'cards', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 700,
        ],
        'sales-quota-table' => [
            'header' => ['align' => 'left', 'name_size' => '2em', 'name_upper' => false, 'name_color' => '#111', 'name_tracking' => null, 'sub_color' => '#b45309', 'rule' => '2px solid #b45309', 'bg' => null],
            'heading' => ['color' => '#92400e', 'tracking' => '0.01em', 'transform' => 'none', 'weight' => 700, 'rule' => '1.5px solid #f59e0b', 'bar' => null],
            'page_accent' => '#b45309', 'entry_style' => 'ruled', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 700,
        ],
        'federal' => [
            'header' => ['align' => 'left', 'name_size' => '1.85em', 'name_upper' => true, 'name_color' => '#000', 'name_tracking' => '0.04em', 'sub_color' => '#000', 'rule' => '1px solid #000', 'bg' => null],
            'heading' => ['color' => '#000', 'tracking' => '0.08em', 'transform' => 'uppercase', 'weight' => 700, 'rule' => '1px solid #000', 'bar' => null],
            'page_accent' => null, 'entry_style' => 'stacked', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 700,
        ],
        'academic-cv' => [
            'header' => ['align' => 'center', 'name_size' => '2.1em', 'name_upper' => false, 'name_color' => '#111', 'name_tracking' => null, 'sub_color' => '#333', 'rule' => '1px solid #111', 'bg' => null],
            'heading' => ['color' => '#16161f', 'tracking' => '0.01em', 'transform' => 'none', 'weight' => 700, 'rule' => '1px solid #111111', 'bar' => null],
            'page_accent' => null, 'entry_style' => 'stacked', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 600,
        ],
        'accent-rule' => [
            'header' => ['align' => 'left', 'name_size' => '2em', 'name_upper' => false, 'name_color' => '#111', 'name_tracking' => null, 'sub_color' => '#4338ca', 'rule' => null, 'bg' => null],
            'heading' => ['color' => '#4338ca', 'tracking' => '0.01em', 'transform' => 'none', 'weight' => 700, 'rule' => '2px solid #4338ca', 'bar' => '#4338ca'],
            'page_accent' => '#4338ca', 'entry_style' => 'default', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 700,
        ],
        'consulting-ledger' => [
            'header' => ['align' => 'left', 'name_size' => '2em', 'name_upper' => false, 'name_color' => '#111', 'name_tracking' => null, 'sub_color' => '#14161a', 'rule' => '1px solid #14161a', 'bg' => null],
            'heading' => ['color' => '#16161f', 'tracking' => '0.01em', 'transform' => 'none', 'weight' => 700, 'rule' => '1.5px solid #14161a', 'bar' => null],
            'page_accent' => null, 'entry_style' => 'ruled', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 700,
        ],
        'education' => [
            'header' => ['align' => 'left', 'name_size' => '2em', 'name_upper' => true, 'name_color' => '#14532d', 'name_tracking' => '0.02em', 'sub_color' => '#1f4d3a', 'rule' => '2px solid #1f4d3a', 'bg' => '#f0fdf4'],
            'heading' => ['color' => '#166534', 'tracking' => '0.1em', 'transform' => 'uppercase', 'weight' => 700, 'rule' => '1.5px solid #1f4d3a', 'bar' => null],
            'page_accent' => null, 'entry_style' => 'stacked', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 700,
        ],
        'startup-one-pager' => [
            'header' => ['align' => 'left', 'name_size' => '1.9em', 'name_upper' => false, 'name_color' => '#111', 'name_tracking' => null, 'sub_color' => '#4f46e5', 'rule' => null, 'bg' => '#eef2ff'],
            'heading' => ['color' => '#4f46e5', 'tracking' => '0.01em', 'transform' => 'none', 'weight' => 700, 'rule' => '1px solid #c7d2fe', 'bar' => null],
            'page_accent' => null, 'entry_style' => 'cards', 'skills_first' => false, 'skills_layout' => 'inline', 'name_weight' => 700,
        ],
        'it-competency-matrix' => [
            'header' => ['align' => 'left', 'name_size' => '2em', 'name_upper' => false, 'name_color' => '#0f172a', 'name_tracking' => null, 'sub_color' => '#1e3a5f', 'rule' => '2px solid #1e3a5f', 'bg' => null],
            'heading' => ['color' => '#1e3a5f', 'tracking' => '0.01em', 'transform' => 'none', 'weight' => 700, 'rule' => null, 'bar' => '#1e3a5f'],
            'page_accent' => '#1e3a5f', 'entry_style' => 'default', 'skills_first' => true, 'skills_layout' => 'columns', 'name_weight' => 700,
        ],
        'centered-traditional' => [
            'header' => ['align' => 'center', 'name_size' => '2.15em', 'name_upper' => true, 'name_color' => '#111', 'name_tracking' => '0.08em', 'sub_color' => '#111111', 'rule' => '2px solid #111111', 'bg' => null],
            'heading' => ['color' => '#16161f', 'tracking' => '0.14em', 'transform' => 'uppercase', 'weight' => 700, 'rule' => '1.5px solid #111111', 'bar' => null],
            'page_accent' => null, 'entry_style' => 'ruled', 'skills_first' => false, 'skills_layout' => null, 'name_weight' => 700,
        ],
    ];

    /**
     * @param  array<string, mixed>  $doc  a ResumeDocument::toArray() payload
     * @return array{name: string, headline: string, contact: string, sections: list<array<string, mixed>>, style: array<string, mixed>}
     */
    public static function build(array $doc): array
    {
        $contact = array_filter([
            $doc['email'] ?? '',
            $doc['phone'] ?? '',
            $doc['location'] ?? '',
            $doc['linkedin'] ?? '',
            $doc['website'] ?? '',
        ], fn (string $part): bool => $part !== '');

        $template = (string) ($doc['template'] ?? 'minimal');
        $style = self::templateStyle($template);
        $order = self::orderSectionsForTemplate(
            array_map('strval', $doc['section_order'] ?? []),
            $style,
        );

        // Template may force a skills presentation (e.g. skills-first → grouped).
        if (($style['skills_layout'] ?? null) !== null) {
            $doc['skills_layout'] = $style['skills_layout'];
        }

        $sections = [];

        foreach ($order as $key) {
            $section = self::section($doc, (string) $key);

            if ($section !== null) {
                $section['entry_style'] = $style['entry_style'] ?? 'default';
                $sections[] = $section;
            }
        }

        return [
            'name' => ($doc['full_name'] ?? '') !== ''
                ? $doc['full_name']
                : (($doc['title'] ?? '') !== '' ? $doc['title'] : 'Resume'),
            'headline' => $doc['headline'] ?? '',
            'contact' => implode(' • ', $contact),
            'sections' => $sections,
            'style' => $style,
            'density' => self::densityScale((string) ($doc['density'] ?? 'balanced')),
        ];
    }

    /**
     * skills-first / it-competency-matrix: surface Skills after Summary
     * without rewriting the stored section_order (mirrors the React preview).
     *
     * @param  list<string>  $order
     * @param  array<string, mixed>  $style
     * @return list<string>
     */
    private static function orderSectionsForTemplate(array $order, array $style): array
    {
        if (! ($style['skills_first'] ?? false)) {
            return $order;
        }

        $withoutSkills = array_values(array_filter(
            $order,
            fn (string $key): bool => $key !== 'skills',
        ));

        if (count($withoutSkills) === count($order)) {
            return $order;
        }

        $summaryIdx = array_search('summary', $withoutSkills, true);
        $insertAt = $summaryIdx === false ? 0 : $summaryIdx + 1;
        array_splice($withoutSkills, $insertAt, 0, ['skills']);

        return $withoutSkills;
    }

    /**
     * PDF spacing/type scale for compact / balanced / spacious.
     * Mirrors the workstation density control so export matches the intent.
     *
     * @return array{body: string, line: string, page_pad_y: string, page_pad_x: string, header_mb: string, section_mt: string, section_mb: string, entry_mb: string, bullet_mb: string, row_pb: string}
     */
    private static function densityScale(string $density): array
    {
        return match ($density) {
            'compact' => [
                'body' => '9.5pt',
                'line' => '1.32',
                'page_pad_y' => '0.5in',
                'page_pad_x' => '0.65in',
                'header_mb' => '10pt',
                'section_mt' => '10pt',
                'section_mb' => '4pt',
                'entry_mb' => '5pt',
                'bullet_mb' => '1pt',
                'row_pb' => '2pt',
            ],
            'spacious' => [
                'body' => '11pt',
                'line' => '1.55',
                'page_pad_y' => '0.75in',
                'page_pad_x' => '0.8in',
                'header_mb' => '16pt',
                'section_mt' => '16pt',
                'section_mb' => '8pt',
                'entry_mb' => '11pt',
                'bullet_mb' => '3pt',
                'row_pb' => '6pt',
            ],
            default => [
                'body' => '10.5pt',
                'line' => '1.45',
                'page_pad_y' => '0.65in',
                'page_pad_x' => '0.75in',
                'header_mb' => '14pt',
                'section_mt' => '14pt',
                'section_mb' => '6pt',
                'entry_mb' => '8pt',
                'bullet_mb' => '2pt',
                'row_pb' => '4pt',
            ],
        };
    }

    /**
     * @return array{header: array{align: string, name_size: string, name_upper: bool, name_color: string, name_tracking: string|null, sub_color: string, rule: string|null, bg: string|null}, heading: array{color: string, tracking: string, transform: string, weight: int, rule: string|null, bar: string|null}, page_accent: string|null, entry_style: string, skills_first: bool, skills_layout: string|null, name_weight: int}
     */
    private static function templateStyle(string $template): array
    {
        return self::TEMPLATE_STYLES[$template] ?? self::TEMPLATE_STYLES['minimal'];
    }

    /** A download-safe base filename for the resume, e.g. "senior-engineer". */
    public static function filename(array $doc): string
    {
        $slug = Str::slug($doc['title'] ?? '');

        return $slug !== '' ? $slug : 'resume';
    }

    /**
     * One section, already filtered to its visible entries, or null when the
     * section has nothing to show (matching the preview, which renders no
     * heading for an empty section).
     *
     * @param  array<string, mixed>  $doc
     * @return array<string, mixed>|null
     */
    private static function section(array $doc, string $key): ?array
    {
        return match ($key) {
            'summary' => ($doc['summary'] ?? '') !== ''
                ? ['kind' => 'text', 'title' => self::TITLES['summary'], 'text' => $doc['summary']]
                : null,

            'experience' => self::entriesSection(
                self::TITLES['experience'],
                array_values(array_filter(
                    $doc['experiences'] ?? [],
                    fn (array $e): bool => ($e['title'] ?? '') !== ''
                        || ($e['company'] ?? '') !== ''
                        || count($e['bullets'] ?? []) > 0,
                )),
                fn (array $e): array => [
                    'primary' => $e['title'] ?? '',
                    'secondary' => $e['company'] ?? '',
                    'dates' => self::dateRange($e['start_date'] ?? '', $e['end_date'] ?? '', (bool) ($e['is_current'] ?? false)),
                    'bullets' => self::visible($e['bullets'] ?? []),
                ],
                (string) ($doc['bullet_style'] ?? 'bullet'),
            ),

            'project' => self::entriesSection(
                self::TITLES['project'],
                array_values(array_filter(
                    $doc['projects'] ?? [],
                    fn (array $p): bool => ($p['name'] ?? '') !== '',
                )),
                fn (array $p): array => [
                    'primary' => $p['name'] ?? '',
                    'secondary' => $p['url'] ?? '',
                    'dates' => self::dateRange($p['start_date'] ?? '', $p['end_date'] ?? '', false),
                    'description' => $p['description'] ?? '',
                    'bullets' => self::visible($p['highlights'] ?? []),
                ],
                // Same document-level style as experience (not a separate control).
                (string) ($doc['bullet_style'] ?? 'bullet'),
            ),

            'education' => self::rowsSection(
                self::TITLES['education'],
                array_values(array_filter(
                    $doc['education'] ?? [],
                    fn (array $e): bool => ($e['school'] ?? '') !== '',
                )),
                // School on its own line; degree · field underneath so the year
                // stays aligned on the right without jamming into the title.
                fn (array $e): array => [
                    'left' => $e['school'] ?? '',
                    'left_sub' => implode(' · ', array_filter([
                        $e['degree'] ?? '',
                        $e['field'] ?? '',
                    ])),
                    'right' => $e['graduation_year'] ?? '',
                ],
            ),

            'certificate' => self::rowsSection(
                self::TITLES['certificate'],
                array_values(array_filter(
                    $doc['certificates'] ?? [],
                    fn (array $c): bool => ($c['name'] ?? '') !== '',
                )),
                // Credential ID sits on the right with issuer/year so a long
                // name never wraps mid-code (e.g. "TC-LA-" / "0629").
                fn (array $c): array => [
                    'left' => $c['name'] ?? '',
                    'right' => implode(' · ', array_filter([
                        $c['issuer'] ?? '',
                        $c['obtained_at'] ?? '',
                        $c['credential_id'] ?? '',
                    ])),
                ],
            ),

            'skills' => self::skillsSection($doc),

            default => null,
        };
    }

    /**
     * @param  list<array<string, mixed>>  $entries
     * @param  callable(array<string, mixed>): array<string, mixed>  $map
     * @return array<string, mixed>|null
     */
    private static function entriesSection(string $title, array $entries, callable $map, string $bulletStyle = 'bullet'): ?array
    {
        return $entries === []
            ? null
            : ['kind' => 'entries', 'title' => $title, 'entries' => array_map($map, $entries), 'bullet_style' => $bulletStyle];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  callable(array<string, mixed>): array{left: string, right: string}  $map
     * @return array<string, mixed>|null
     */
    private static function rowsSection(string $title, array $rows, callable $map): ?array
    {
        return $rows === []
            ? null
            : ['kind' => 'rows', 'title' => $title, 'rows' => array_map($map, $rows)];
    }

    /**
     * @param  array<string, mixed>  $doc
     * @return array<string, mixed>|null
     */
    private static function skillsSection(array $doc): ?array
    {
        $skills = $doc['skills'] ?? [];

        if ($skills === []) {
            return null;
        }

        $names = array_map(fn (array $s): string => $s['name'], $skills);

        // First-seen category order, matching the preview's grouped layout.
        $groups = [];

        foreach ($skills as $skill) {
            $groups[$skill['category'] ?? ''][] = $skill['name'];
        }

        return [
            'kind' => 'skills',
            'title' => self::TITLES['skills'],
            'layout' => $doc['skills_layout'] ?? 'inline',
            'names' => $names,
            'groups' => array_map(
                fn (string $category, array $items): array => ['category' => $category, 'names' => $items],
                array_keys($groups),
                array_values($groups),
            ),
        ];
    }

    /** "Sep 2016 – Present", collapsing to whichever end is filled in. */
    private static function dateRange(string $start, string $end, bool $isCurrent): string
    {
        return implode(' – ', array_filter([$start, $isCurrent ? 'Present' : $end]));
    }

    /**
     * @param  array<mixed>  $lines
     * @return list<string>
     */
    private static function visible(array $lines): array
    {
        return array_values(array_filter(
            $lines,
            fn (mixed $line): bool => is_string($line) && $line !== '',
        ));
    }
}
