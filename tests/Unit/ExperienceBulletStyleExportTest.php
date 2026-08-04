<?php

namespace Tests\Unit;

use App\Support\DocxExport;
use App\Support\ResumeExport;
use PHPUnit\Framework\TestCase;
use ZipArchive;

/**
 * `bullet_style` is a resume-level setting shared by Work Experience and
 * Projects (one control under ExperienceFields). Both sections must honor it
 * in ResumeExport / DocxExport.
 */
class ExperienceBulletStyleExportTest extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    private function doc(string $bulletStyle = 'bullet'): array
    {
        return [
            'title' => 'Resume',
            'full_name' => 'Jane Doe',
            'headline' => '',
            'email' => '',
            'phone' => '',
            'location' => '',
            'linkedin' => '',
            'website' => '',
            'template' => 'minimal',
            'bullet_style' => $bulletStyle,
            'section_order' => ['experience', 'project'],
            'experiences' => [
                ['title' => 'Engineer', 'company' => 'Acme', 'start_date' => '', 'end_date' => '', 'is_current' => false, 'bullets' => ['Shipped the thing', 'Fixed the bug']],
            ],
            'projects' => [
                ['name' => 'Side Project', 'url' => '', 'start_date' => '', 'end_date' => '', 'description' => '', 'highlights' => ['Built it', 'Shared it']],
            ],
        ];
    }

    public function test_defaults_to_bullet_when_unset(): void
    {
        $doc = $this->doc();
        unset($doc['bullet_style']);

        $view = ResumeExport::build($doc);
        $experience = collect($view['sections'])->firstWhere('title', 'Work Experience');
        $project = collect($view['sections'])->firstWhere('title', 'Projects');

        $this->assertSame('bullet', $experience['bullet_style']);
        $this->assertSame('bullet', $project['bullet_style']);
    }

    public function test_bullet_style_applies_to_experience_and_projects(): void
    {
        $view = ResumeExport::build($this->doc('numbered'));

        $experience = collect($view['sections'])->firstWhere('title', 'Work Experience');
        $project = collect($view['sections'])->firstWhere('title', 'Projects');

        $this->assertSame('numbered', $experience['bullet_style']);
        $this->assertSame('numbered', $project['bullet_style']);
    }

    public function test_docx_numbers_experience_and_project_bullets(): void
    {
        $xml = $this->docxBody($this->doc('numbered'));

        $this->assertStringContainsString('1.  Shipped the thing', $xml);
        $this->assertStringContainsString('2.  Fixed the bug', $xml);
        $this->assertStringContainsString('1.  Built it', $xml);
        $this->assertStringContainsString('2.  Shared it', $xml);
        $this->assertStringNotContainsString('•  Built it', $xml);
    }

    public function test_docx_indented_style_drops_the_bullet_marker(): void
    {
        $xml = $this->docxBody($this->doc('indented'));

        $this->assertStringContainsString('>Shipped the thing<', $xml);
        $this->assertStringNotContainsString('•  Shipped the thing', $xml);
        $this->assertStringNotContainsString('1.  Shipped the thing', $xml);
        $this->assertStringNotContainsString('•  Built it', $xml);
    }

    /**
     * A hanging indent (used for bullet/numbered) reserves space for the
     * marker, so only wrapped lines are pushed in — the first line sits at
     * the margin. With no marker, that reads as a broken/uneven indent, so
     * "indented" must use a plain left indent applied to every line instead.
     */
    public function test_docx_indented_style_uses_a_plain_indent_not_a_hanging_one(): void
    {
        $xml = $this->docxBody($this->doc('indented'));

        $this->assertStringContainsString('<w:ind w:left="360"/>', $xml);
    }

    /**
     * @param  array<string, mixed>  $doc
     */
    private function docxBody(array $doc): string
    {
        $bytes = DocxExport::build($doc);
        $path = tempnam(sys_get_temp_dir(), 'docx-test');
        file_put_contents($path, $bytes);

        $zip = new ZipArchive;
        $zip->open($path);
        $xml = $zip->getFromName('word/document.xml');
        $zip->close();
        unlink($path);

        return $xml;
    }
}
