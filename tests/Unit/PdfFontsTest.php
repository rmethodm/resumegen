<?php

namespace Tests\Unit;

use App\Support\PdfFonts;
use App\Support\ResumeDocument;
use Barryvdh\DomPDF\Facade\Pdf;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PdfFontsTest extends TestCase
{
    public function test_every_resume_font_resolves(): void
    {
        foreach (ResumeDocument::FONTS as $font) {
            $resolved = PdfFonts::resolve($font);

            $this->assertNotSame('', $resolved['family'], $font);
            $this->assertNotSame('', $resolved['stack'], $font);
            $this->assertIsArray($resolved['faces'], $font);
        }
    }

    public function test_unknown_font_falls_back_to_inter(): void
    {
        $resolved = PdfFonts::resolve('not-a-real-font');

        $this->assertSame('Inter', $resolved['family']);
        $this->assertNotEmpty($resolved['faces']);
    }

    #[DataProvider('embeddedFonts')]
    public function test_open_source_fonts_embed_ttf_files(string $font, string $family): void
    {
        $resolved = PdfFonts::resolve($font);

        $this->assertSame($family, $resolved['family']);
        $this->assertCount(2, $resolved['faces']);
        $this->assertFileExists($resolved['faces'][0]['path']);
        $this->assertFileExists($resolved['faces'][1]['path']);
        $this->assertStringContainsString('@font-face', PdfFonts::faceCss($resolved));
    }

    /**
     * @return list<array{0: string, 1: string}>
     */
    public static function embeddedFonts(): array
    {
        return [
            ['inter', 'Inter'],
            ['open-sans', 'Open Sans'],
            ['lato', 'Lato'],
            ['roboto', 'Roboto'],
            ['montserrat', 'Montserrat'],
            ['ibm-plex-sans', 'IBM Plex Sans'],
            ['work-sans', 'Work Sans'],
            ['eb-garamond', 'EB Garamond'],
            ['ibm-plex-mono', 'IBM Plex Mono'],
            ['libre-baskerville', 'Libre Baskerville'],
            ['source-serif-4', 'Source Serif 4'],
            ['figtree', 'Figtree'],
            ['calibri', 'Carlito'],
            ['cambria', 'Caladea'],
            ['garamond', 'EB Garamond'],
        ];
    }

    public function test_proprietary_system_fonts_use_core_pdf_faces(): void
    {
        foreach (['arial', 'times', 'georgia'] as $font) {
            $resolved = PdfFonts::resolve($font);

            $this->assertSame([], $resolved['faces'], $font);
            $this->assertNotNull($resolved['pdf_label'], $font);
            $this->assertSame('', PdfFonts::faceCss($resolved), $font);
        }
    }

    public function test_pdf_labels_cover_approximated_faces_only(): void
    {
        $labels = PdfFonts::pdfLabels();

        $this->assertArrayHasKey('arial', $labels);
        $this->assertArrayHasKey('calibri', $labels);
        $this->assertArrayNotHasKey('inter', $labels);
    }

    public function test_ensure_installed_normalizes_vertical_metrics_for_source_serif(): void
    {
        $resolved = PdfFonts::resolve('source-serif-4');
        PdfFonts::ensureInstalled($resolved);

        $ufms = glob(storage_path('fonts/source_serif_4_*.ufm')) ?: [];
        $this->assertNotEmpty($ufms, 'expected Dompdf cache UFM files for Source Serif 4');

        foreach ($ufms as $ufm) {
            $this->assertTrue(
                PdfFonts::ufmHasNormalizedMetrics($ufm),
                'UFM should use browser-like Ascender/Descender: '.$ufm,
            );
        }
    }

    public function test_source_serif_pdf_line_height_matches_core_font_scale(): void
    {
        $html = static function (string $family, string $faceCss): string {
            return <<<HTML
            <html><head><style>
            {$faceCss}
            body { font-family: {$family}; font-size: 10.5pt; line-height: 1.45; margin: 0; padding: 72pt; }
            p { margin: 0; }
            </style></head><body>
            <p>AAAA line one of text that wraps at some point hopefully near the end of the line maybe extra words for wrap.</p>
            </body></html>
            HTML;
        };

        $serif = PdfFonts::resolve('source-serif-4');
        PdfFonts::ensureInstalled($serif);
        $serifBytes = Pdf::loadHTML(
            $html("'Source Serif 4', Helvetica, sans-serif", PdfFonts::faceCss($serif)),
        )->setPaper('letter')->output();

        $coreBytes = Pdf::loadHTML(
            $html('Helvetica, sans-serif', ''),
        )->setPaper('letter')->output();

        $serifDelta = $this->firstLineDelta($serifBytes);
        $coreDelta = $this->firstLineDelta($coreBytes);

        // Before metric normalization Source Serif sat near ~23pt; Helvetica near ~15.5pt.
        $this->assertGreaterThan(12.0, $serifDelta);
        $this->assertLessThan(18.5, $serifDelta, 'Source Serif line box should not balloon past browser-like leading');
        $this->assertEqualsWithDelta($coreDelta, $serifDelta, 3.0, 'embedded serif leading should track core Helvetica');
        $this->assertStringContainsString('SourceSerif', $serifBytes);
    }

    private function firstLineDelta(string $pdfBytes): float
    {
        preg_match_all("/stream\r?\n(.*?)\r?\nendstream/s", $pdfBytes, $streams);
        $ys = [];
        foreach ($streams[1] as $stream) {
            $decoded = @gzuncompress($stream);
            if ($decoded === false || ! str_contains($decoded, 'Td')) {
                continue;
            }
            if (preg_match_all('/BT ([\d.]+) ([\d.]+) Td/', $decoded, $matches)) {
                foreach ($matches[2] as $y) {
                    $ys[] = (float) $y;
                }
            }
        }

        $ys = array_values(array_unique($ys));
        rsort($ys);
        $this->assertGreaterThanOrEqual(2, count($ys), 'expected at least two text lines in PDF stream');

        return round($ys[0] - $ys[1], 2);
    }
}
