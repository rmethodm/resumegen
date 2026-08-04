<?php

namespace Tests\Unit;

use App\Support\ResumeExport;
use PHPUnit\Framework\TestCase;

/**
 * Templates must change more than accent colour: entry chrome, skills order,
 * and skills layout overrides are part of the export contract shared with the
 * React preview.
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

    public function test_modern_uses_stacked_entries_and_header_band(): void
    {
        $view = ResumeExport::build($this->baseDoc('modern'));

        $this->assertSame('stacked', $view['style']['entry_style']);
        $this->assertSame('#eef2ff', $view['style']['header']['bg']);
        $this->assertSame('#4f46e5', $view['style']['page_accent']);
    }

    public function test_metric_cards_uses_cards_entry_style(): void
    {
        $view = ResumeExport::build($this->baseDoc('metric-cards'));

        $this->assertSame('cards', $view['style']['entry_style']);
        $experience = collect($view['sections'])->firstWhere('title', 'Work Experience');
        $this->assertSame('cards', $experience['entry_style']);
    }

    public function test_skills_first_reorders_skills_after_summary(): void
    {
        $view = ResumeExport::build($this->baseDoc('skills-first'));

        $titles = array_column($view['sections'], 'title');
        $this->assertSame(['Summary', 'Skills', 'Work Experience'], $titles);
        $this->assertTrue($view['style']['skills_first']);

        $skills = collect($view['sections'])->firstWhere('title', 'Skills');
        $this->assertSame('grouped', $skills['layout']);
    }

    public function test_ats_stays_plain_without_accents(): void
    {
        $view = ResumeExport::build($this->baseDoc('ats'));

        $this->assertNull($view['style']['header']['bg']);
        $this->assertNull($view['style']['page_accent']);
        $this->assertNull($view['style']['heading']['rule']);
        $this->assertNull($view['style']['heading']['bar']);
    }
}
