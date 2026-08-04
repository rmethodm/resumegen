<?php

namespace Tests\Unit;

use App\Support\DocxExport;
use App\Support\ResumeExport;
use PHPUnit\Framework\TestCase;
use ZipArchive;

/**
 * Certifications use the education-style two-line left column (name + issuer)
 * with a short right column (year · credential id). Cramming issuer into the
 * right side used to force long names to wrap mid-phrase beside a long meta
 * string — the PDF looked broken even though the text was complete.
 */
class CertificateExportLayoutTest extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    private function doc(): array
    {
        return [
            'title' => 'Resume',
            'full_name' => 'Dana Katherine Scully, M.D.',
            'headline' => '',
            'email' => '',
            'phone' => '',
            'location' => '',
            'linkedin' => '',
            'website' => '',
            'template' => 'ats-plain',
            'section_order' => ['certificate'],
            'certificates' => [
                [
                    'name' => 'Board Certification — Anatomic Pathology',
                    'issuer' => 'American Board of Pathology (fictional credential label)',
                    'obtained_at' => '1991',
                    'expires_at' => '',
                    'credential_id' => 'ABP-AP-DS',
                ],
                [
                    'name' => 'Forensic Pathology Fellowship Completion',
                    'issuer' => 'University Medical Examiner Program',
                    'obtained_at' => '1991',
                    'expires_at' => '',
                    'credential_id' => 'UME-FP-90',
                ],
            ],
        ];
    }

    public function test_certificates_put_issuer_under_name_not_in_right_column(): void
    {
        $view = ResumeExport::build($this->doc());
        $section = collect($view['sections'])->firstWhere('title', 'Certifications');

        $this->assertNotNull($section);
        $this->assertSame('rows', $section['kind']);
        $this->assertCount(2, $section['rows']);

        $first = $section['rows'][0];
        $this->assertSame('Board Certification — Anatomic Pathology', $first['left']);
        $this->assertSame('American Board of Pathology (fictional credential label)', $first['left_sub']);
        $this->assertSame('1991 · ABP-AP-DS', $first['right']);
        $this->assertStringNotContainsString('American Board', $first['right']);

        $second = $section['rows'][1];
        $this->assertSame('Forensic Pathology Fellowship Completion', $second['left']);
        $this->assertSame('University Medical Examiner Program', $second['left_sub']);
        $this->assertSame('1991 · UME-FP-90', $second['right']);
    }

    public function test_docx_includes_certificate_issuer_on_its_own_line(): void
    {
        $xml = $this->docxBody($this->doc());

        $this->assertStringContainsString('Board Certification — Anatomic Pathology', $xml);
        $this->assertStringContainsString('1991 · ABP-AP-DS', $xml);
        $this->assertStringContainsString('American Board of Pathology (fictional credential label)', $xml);
        // Issuer must not be jammed into the same run as the credential meta.
        $this->assertStringNotContainsString(
            'American Board of Pathology (fictional credential label) · 1991 · ABP-AP-DS',
            $xml,
        );
    }

    private function docxBody(array $doc): string
    {
        $bytes = DocxExport::build($doc);
        $tmp = tempnam(sys_get_temp_dir(), 'docx');
        file_put_contents($tmp, $bytes);

        $zip = new ZipArchive;
        $this->assertTrue($zip->open($tmp));
        $xml = $zip->getFromName('word/document.xml');
        $zip->close();
        unlink($tmp);

        $this->assertNotFalse($xml);

        return html_entity_decode(strip_tags($xml), ENT_QUOTES | ENT_XML1, 'UTF-8');
    }
}
