<?php

namespace App\Support;

/**
 * Maps a resume's selected UI font to a PDF-embeddable face.
 *
 * Preview uses web fonts (and system proprietary faces). PDF export cannot
 * ship Calibri / Cambria / Arial / Times / Georgia, so those map to metric
 * clones or core PDF fonts. All other faces load TTF files from
 * resources/fonts/pdf via @font-face in the export Blade.
 */
final class PdfFonts
{
    /**
     * @return array{
     *     family: string,
     *     stack: string,
     *     faces: list<array{weight: int, path: string}>,
     *     pdf_label: string|null
     * }
     */
    public static function resolve(?string $font): array
    {
        $key = is_string($font) && in_array($font, ResumeDocument::FONTS, true)
            ? $font
            : 'inter';

        return match ($key) {
            'inter' => self::embedded('Inter', 'Inter', 'Inter-Regular.ttf', 'Inter-Bold.ttf'),
            'open-sans' => self::embedded('Open Sans', 'Open Sans', 'OpenSans-Regular.ttf', 'OpenSans-Bold.ttf'),
            'lato' => self::embedded('Lato', 'Lato', 'Lato-Regular.ttf', 'Lato-Bold.ttf'),
            'roboto' => self::embedded('Roboto', 'Roboto', 'Roboto-Regular.ttf', 'Roboto-Bold.ttf'),
            'montserrat' => self::embedded('Montserrat', 'Montserrat', 'Montserrat-Regular.ttf', 'Montserrat-Bold.ttf'),
            'ibm-plex-sans' => self::embedded('IBM Plex Sans', 'IBM Plex Sans', 'IBMPlexSans-Regular.ttf', 'IBMPlexSans-Bold.ttf'),
            'work-sans' => self::embedded('Work Sans', 'Work Sans', 'WorkSans-Regular.ttf', 'WorkSans-Bold.ttf'),
            'eb-garamond' => self::embedded('EB Garamond', 'EB Garamond', 'EBGaramond-Regular.ttf', 'EBGaramond-Bold.ttf'),
            'ibm-plex-mono' => self::embedded('IBM Plex Mono', 'IBM Plex Mono', 'IBMPlexMono-Regular.ttf', 'IBMPlexMono-Bold.ttf'),
            'libre-baskerville' => self::embedded('Libre Baskerville', 'Libre Baskerville', 'LibreBaskerville-Regular.ttf', 'LibreBaskerville-Bold.ttf'),
            'source-serif-4' => self::embedded('Source Serif 4', 'Source Serif 4', 'SourceSerif4-Regular.ttf', 'SourceSerif4-Bold.ttf'),
            'figtree' => self::embedded('Figtree', 'Figtree', 'Figtree-Regular.ttf', 'Figtree-Bold.ttf'),
            'garamond' => self::embedded(
                'EB Garamond',
                'EB Garamond',
                'EBGaramond-Regular.ttf',
                'EBGaramond-Bold.ttf',
                'PDF uses EB Garamond',
            ),
            'calibri' => self::embedded(
                'Carlito',
                'Carlito',
                'Carlito-Regular.ttf',
                'Carlito-Bold.ttf',
                'PDF uses Carlito',
            ),
            'cambria' => self::embedded(
                'Caladea',
                'Caladea',
                'Caladea-Regular.ttf',
                'Caladea-Bold.ttf',
                'PDF uses Caladea',
            ),
            // Proprietary system faces — core PDF fonts (always available, no file).
            'arial' => self::core('Helvetica', 'Helvetica, Arial, sans-serif', 'PDF uses Helvetica'),
            'times' => self::core('Times-Roman', '"Times-Roman", "Times New Roman", serif', 'PDF uses Times'),
            'georgia' => self::core('Times-Roman', '"Times-Roman", Georgia, serif', 'PDF uses Times'),
            default => self::embedded('Inter', 'Inter', 'Inter-Regular.ttf', 'Inter-Bold.ttf'),
        };
    }

    /**
     * CSS block with @font-face rules for the resolved font (empty for core fonts).
     *
     * @param  array{family: string, stack: string, faces: list<array{weight: int, path: string}>, pdf_label: string|null}  $resolved
     */
    public static function faceCss(array $resolved): string
    {
        if ($resolved['faces'] === []) {
            return '';
        }

        $chunks = [];

        foreach ($resolved['faces'] as $face) {
            $path = str_replace('\\', '/', $face['path']);
            $family = $resolved['family'];
            $weight = $face['weight'];
            $chunks[] = <<<CSS
@font-face {
    font-family: '{$family}';
    font-style: normal;
    font-weight: {$weight};
    src: url('file://{$path}') format('truetype');
}
CSS;
        }

        return implode("\n", $chunks);
    }

    /**
     * Human-readable note when the PDF face is not the same product name as the UI.
     *
     * @return array<string, string> keyed by ResumeFont
     */
    public static function pdfLabels(): array
    {
        $labels = [];

        foreach (ResumeDocument::FONTS as $font) {
            $note = self::resolve($font)['pdf_label'];
            if ($note !== null) {
                $labels[$font] = $note;
            }
        }

        return $labels;
    }

    /**
     * @return array{family: string, stack: string, faces: list<array{weight: int, path: string}>, pdf_label: string|null}
     */
    private static function embedded(
        string $family,
        string $stack,
        string $regularFile,
        string $boldFile,
        ?string $pdfLabel = null,
    ): array {
        $dir = resource_path('fonts/pdf');
        $regular = $dir.DIRECTORY_SEPARATOR.$regularFile;
        $bold = $dir.DIRECTORY_SEPARATOR.$boldFile;

        $faces = [];

        if (is_file($regular)) {
            $faces[] = ['weight' => 400, 'path' => $regular];
        }

        if (is_file($bold)) {
            $faces[] = ['weight' => 700, 'path' => $bold];
        }

        // Missing TTF files: fall back to core sans so export never hard-fails.
        if ($faces === []) {
            return self::core('Helvetica', 'Helvetica, Arial, sans-serif', $pdfLabel ?? 'PDF uses Helvetica');
        }

        return [
            'family' => $family,
            'stack' => "'{$stack}', Helvetica, sans-serif",
            'faces' => $faces,
            'pdf_label' => $pdfLabel,
        ];
    }

    /**
     * @return array{family: string, stack: string, faces: list<array{weight: int, path: string}>, pdf_label: string|null}
     */
    private static function core(string $family, string $stack, ?string $pdfLabel = null): array
    {
        return [
            'family' => $family,
            'stack' => $stack,
            'faces' => [],
            'pdf_label' => $pdfLabel,
        ];
    }
}
