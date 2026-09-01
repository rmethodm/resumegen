<?php

namespace Tests\Unit;

use App\Support\DocxExport;
use App\Support\InlineMarkdown;
use PHPUnit\Framework\TestCase;
use ZipArchive;

class InlineMarkdownTest extends TestCase
{
    public function test_to_html_renders_bold_italic_and_links(): void
    {
        $html = InlineMarkdown::toHtml('**bold** and *italic* and [Acme](https://example.com)');

        $this->assertStringContainsString('<strong>bold</strong>', $html);
        $this->assertStringContainsString('<em>italic</em>', $html);
        $this->assertStringContainsString('href="https://example.com"', $html);
        $this->assertStringContainsString('>Acme</a>', $html);
    }

    public function test_to_plain_strips_markers(): void
    {
        $this->assertSame(
            'bold and Acme',
            InlineMarkdown::toPlain('**bold** and [Acme](https://example.com)'),
        );
    }

    public function test_to_runs_splits_marks(): void
    {
        $runs = InlineMarkdown::toRuns('Shipped **feature** to [Acme](https://acme.test)');

        $this->assertSame('Shipped ', $runs[0]['text']);
        $this->assertFalse($runs[0]['bold']);

        $this->assertSame('feature', $runs[1]['text']);
        $this->assertTrue($runs[1]['bold']);

        $acme = collect($runs)->firstWhere('text', 'Acme');
        $this->assertNotNull($acme);
        $this->assertSame('https://acme.test', $acme['href']);
    }

    public function test_docx_keeps_bold_runs_for_markdown_bullets(): void
    {
        $doc = [
            'title' => 'Resume',
            'full_name' => 'Jane Doe',
            'headline' => '',
            'email' => '',
            'phone' => '',
            'location' => '',
            'linkedin' => '',
            'website' => '',
            'template' => 'ats-plain',
            'bullet_style' => 'bullet',
            'section_order' => ['experience'],
            'experiences' => [
                [
                    'title' => 'Engineer',
                    'company' => 'Acme',
                    'start_date' => '',
                    'end_date' => '',
                    'is_current' => false,
                    'bullets' => ['Shipped **feature X**'],
                ],
            ],
            'projects' => [],
        ];

        $binary = DocxExport::build($doc);
        $zip = new ZipArchive;
        $tmp = tempnam(sys_get_temp_dir(), 'docx');
        file_put_contents($tmp, $binary);
        $zip->open($tmp);
        $xml = $zip->getFromName('word/document.xml');
        $zip->close();
        unlink($tmp);

        $this->assertIsString($xml);
        $this->assertStringContainsString('<w:b/>', $xml);
        $this->assertStringContainsString('feature X', $xml);
        $this->assertStringContainsString('Shipped ', $xml);
    }
}
