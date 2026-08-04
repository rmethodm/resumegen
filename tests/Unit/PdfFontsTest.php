<?php

namespace Tests\Unit;

use App\Support\PdfFonts;
use App\Support\ResumeDocument;
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
}
