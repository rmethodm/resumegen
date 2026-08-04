<?php

namespace Tests\Unit;

use App\Support\ResumeDocument;
use App\Support\ResumeExport;
use PHPUnit\Framework\TestCase;

/**
 * Templates must change more than accent colour: entry chrome and header
 * treatment are part of the export contract shared with the React preview.
 */
class TemplateLayoutExportTest extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    private function baseDoc(string $template): array
    {
        return [
            'title' => 'Resume',
            'full_name' => 'Jane Doe',
            'headline' => 'Engineer',
            'email' => 'jane@example.com',
            'phone' => '',
            'location' => '',
            'linkedin' => '',
            'website' => '',
            'template' => $template,
            'summary' => 'A short summary.',
            'skills_layout' => 'inline',
            'section_order' => ['summary', 'experience', 'skills'],
            'experiences' => [
                [
                    'title' => 'Engineer',
                    'company' => 'Acme',
                    'start_date' => '2020',
                    'end_date' => '',
                    'is_current' => true,
                    'bullets' => ['Shipped features'],
                ],
            ],
            'skills' => [
                ['name' => 'PHP', 'category' => 'Backend'],
                ['name' => 'React', 'category' => 'Frontend'],
            ],
            'projects' => [],
            'education' => [],
            'certificates' => [],
        ];
    }

    public function test_catalogue_is_exactly_four_themes(): void
    {
        $this->assertSame(
            ['ats-plain', 'classic', 'modern', 'minimalist'],
            ResumeDocument::TEMPLATES,
        );
    }

    public function test_modern_uses_stacked_entries_and_header_band(): void
    {
        $view = ResumeExport::build($this->baseDoc('modern'));

        $this->assertSame('stacked', $view['style']['entry_style']);
        $this->assertSame('#eef2ff', $view['style']['header']['bg']);
        $this->assertSame('#4f46e5', $view['style']['page_accent']);
    }

    public function test_classic_uses_ruled_entries_and_double_header_rule(): void
    {
        $view = ResumeExport::build($this->baseDoc('classic'));

        $this->assertSame('ruled', $view['style']['entry_style']);
        $this->assertSame('3px double #181818', $view['style']['header']['rule']);
        $this->assertNull($view['style']['page_accent']);
    }

    public function test_ats_plain_stays_plain_without_accents(): void
    {
        $view = ResumeExport::build($this->baseDoc('ats-plain'));

        $this->assertNull($view['style']['header']['bg']);
        $this->assertNull($view['style']['page_accent']);
        $this->assertNull($view['style']['heading']['bar']);
        $this->assertSame('0', $view['style']['heading']['tracking']);
        $this->assertSame('stacked', $view['style']['entry_style']);
    }

    public function test_minimalist_uses_muted_headings(): void
    {
        $view = ResumeExport::build($this->baseDoc('minimalist'));

        $this->assertSame('#a1a1aa', $view['style']['heading']['color']);
        $this->assertSame(500, $view['style']['name_weight']);
        $this->assertSame('stacked', $view['style']['entry_style']);
    }

    public function test_retired_template_keys_resolve_to_kept_themes(): void
    {
        $this->assertSame('ats-plain', ResumeDocument::resolveTemplate('ats'));
        $this->assertSame('classic', ResumeDocument::resolveTemplate('ivy-serif'));
        $this->assertSame('modern', ResumeDocument::resolveTemplate('engineering'));
        $this->assertSame('minimalist', ResumeDocument::resolveTemplate('minimal'));

        $view = ResumeExport::build($this->baseDoc('engineering'));
        $this->assertSame('#4f46e5', $view['style']['page_accent']);
    }
}
