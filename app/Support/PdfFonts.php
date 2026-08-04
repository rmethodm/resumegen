<?php

namespace App\Support;

use FontLib\Font;

/**
 * Maps a resume's selected UI font to a PDF-embeddable face.
 *
 * Preview uses web fonts (and system proprietary faces). PDF export cannot
 * ship Calibri / Cambria / Arial / Times / Georgia, so those map to metric
 * clones or core PDF fonts. All other faces load TTF files from
 * resources/fonts/pdf via @font-face in the export Blade.
 *
 * Dompdf derives line-box height from UFM Ascender/Descender. php-font-lib
 * often records very tall values from hhea/OS2 (especially for serif faces
 * like Source Serif 4), so unitless CSS line-height balloons and the PDF
 * looks loosely tracked / poorly embedded. {@see ensureInstalled()} pre-writes
 * Dompdf's font-cache entries with normalized vertical metrics so the first
 * export already lays out correctly.
 */
final class PdfFonts
{
    /**
     * Target em-box for UFM metrics (units per em = 1000). Dompdf line height
     * becomes ~font-size × font_height_ratio × (asc−desc)/1000; with the
     * default ratio 1.1 this yields ~1.1× font-size before CSS line-height.
     */
    private const METRIC_ASCENDER = 800;

    private const METRIC_DESCENDER = -200;

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
     * Pre-install each face into Dompdf's font dir using the same cache keys
     * Dompdf's @font-face loader would create, with normalized vertical metrics.
     * Safe to call on every export.
     *
     * @param  array{family: string, stack: string, faces: list<array{weight: int, path: string}>, pdf_label: string|null}  $resolved
     */
    public static function ensureInstalled(array $resolved): void
    {
        if ($resolved['faces'] === []) {
            return;
        }

        $fontDir = storage_path('fonts');
        if (! is_dir($fontDir)) {
            mkdir($fontDir, 0755, true);
        }

        $families = self::readInstalledFamilies($fontDir);
        $familyKey = mb_strtolower($resolved['family'], 'UTF-8');
        $entry = $families[$familyKey] ?? [];
        $changed = false;

        foreach ($resolved['faces'] as $face) {
            $style = $face['weight'] >= 700 ? 'bold' : 'normal';
            $srcPath = $face['path'];
            if (! is_file($srcPath)) {
                continue;
            }

            // Dompdf hashes the file:// URL form of the @font-face src.
            $remoteFile = 'file://'.str_replace('\\', '/', $srcPath);
            $localBase = self::dompdfCacheBaseName($resolved['family'], $style, $remoteFile);
            $localPath = $fontDir.DIRECTORY_SEPARATOR.$localBase;
            $ufmPath = $localPath.'.ufm';
            $ttfPath = $localPath.'.ttf';

            if (! is_file($ufmPath) || ! is_file($ttfPath)) {
                self::buildFontCache($srcPath, $localPath);
                $changed = true;
            }

            if (is_file($ufmPath) && self::normalizeUfmFile($ufmPath)) {
                $changed = true;
            }

            if (is_file($ufmPath) && is_file($ttfPath) && ($entry[$style] ?? null) !== $localPath) {
                $entry[$style] = $localPath;
                $changed = true;
            }
        }

        // Also fix any older cache entries for this family (different source hash).
        $slug = self::dompdfFamilySlug($resolved['family']);
        foreach (glob($fontDir.DIRECTORY_SEPARATOR.$slug.'_*.ufm') ?: [] as $ufm) {
            if (self::normalizeUfmFile($ufm)) {
                $changed = true;
            }
        }

        if ($entry !== [] && ($changed || ! isset($families[$familyKey]))) {
            $families[$familyKey] = $entry;
            self::writeInstalledFamilies($fontDir, $families);
        }
    }

    /**
     * CSS block with @font-face rules for the resolved font (empty for core fonts).
     * Calls {@see ensureInstalled()} so metrics are ready before Dompdf parses HTML.
     *
     * @param  array{family: string, stack: string, faces: list<array{weight: int, path: string}>, pdf_label: string|null}  $resolved
     */
    public static function faceCss(array $resolved): string
    {
        if ($resolved['faces'] === []) {
            return '';
        }

        self::ensureInstalled($resolved);

        $chunks = [];

        foreach ($resolved['faces'] as $face) {
            $path = str_replace('\\', '/', $face['path']);
            $family = $resolved['family'];
            $weight = $face['weight'];
            // file:// matches Dompdf's resolved URL (and our cache key hash).
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
     * Whether a UFM file already uses the normalized vertical metrics.
     */
    public static function ufmHasNormalizedMetrics(string $ufmPath): bool
    {
        if (! is_file($ufmPath)) {
            return false;
        }

        $content = file_get_contents($ufmPath);
        if ($content === false) {
            return false;
        }

        return (bool) preg_match('/^Ascender\s+'.self::METRIC_ASCENDER.'\s*$/m', $content)
            && (bool) preg_match('/^Descender\s+'.preg_quote((string) self::METRIC_DESCENDER, '/').'\s*$/m', $content);
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

    /**
     * Mirror Dompdf\FontMetrics::registerFont prefix + md5($remoteFile).
     */
    private static function dompdfCacheBaseName(string $family, string $styleString, string $remoteFile): string
    {
        return self::dompdfFamilyStylePrefix($family, $styleString).'_'.md5($remoteFile);
    }

    /**
     * Family slug without style — used to glob older cache files for this face.
     * "Source Serif 4" → "source_serif_4"
     */
    private static function dompdfFamilySlug(string $family): string
    {
        $slug = mb_strtolower($family, 'UTF-8');
        $slug = preg_replace('/[\W]+/', '_', $slug) ?? $slug;

        return trim($slug, '_');
    }

    private static function dompdfFamilyStylePrefix(string $family, string $styleString): string
    {
        $fontname = mb_strtolower($family, 'UTF-8');
        $prefix = $fontname.'_'.$styleString;
        $prefix = trim($prefix, '-');

        if (function_exists('iconv')) {
            $converted = @iconv('utf-8', 'us-ascii//TRANSLIT', $prefix);
            if (is_string($converted) && $converted !== '') {
                $prefix = $converted;
            }
        }

        $prefixEncoding = mb_detect_encoding($prefix, mb_detect_order(), true) ?: 'UTF-8';
        $substchar = mb_substitute_character();
        mb_substitute_character(0x005F);
        $prefix = mb_convert_encoding($prefix, 'ISO-8859-1', $prefixEncoding);
        mb_substitute_character($substchar);

        // Same (quirky) patterns Dompdf uses — do not "fix" the delimiters.
        $prefix = preg_replace('[\W]', '_', $prefix) ?? $prefix;
        $prefix = preg_replace('/[^-_\w]+/', '', $prefix) ?? $prefix;

        return $prefix;
    }

    private static function buildFontCache(string $srcPath, string $localPath): void
    {
        $font = Font::load($srcPath);
        if ($font === null) {
            return;
        }

        $font->parse();
        $font->saveAdobeFontMetrics($localPath.'.ufm');
        $font->close();

        // Dompdf expects a sibling .ttf next to the .ufm entry.
        if (! is_file($localPath.'.ttf')) {
            copy($srcPath, $localPath.'.ttf');
        }
    }

    /**
     * Rewrite vertical metrics so Dompdf line boxes match browser-like leading.
     * Glyph widths (WX) are left alone — only Ascender/Descender change.
     *
     * @return bool true when the file was modified
     */
    private static function normalizeUfmFile(string $ufmPath): bool
    {
        if (self::ufmHasNormalizedMetrics($ufmPath)) {
            return false;
        }

        $content = file_get_contents($ufmPath);
        if ($content === false) {
            return false;
        }

        $next = preg_replace('/^Ascender\s+.+$/m', 'Ascender '.self::METRIC_ASCENDER, $content) ?? $content;
        $next = preg_replace('/^Descender\s+.+$/m', 'Descender '.self::METRIC_DESCENDER, $next) ?? $next;

        if ($next === $content) {
            return false;
        }

        file_put_contents($ufmPath, $next);

        // Drop stale JSON companion so Dompdf re-reads the UFM.
        $jsonPath = $ufmPath.'.json';
        if (is_file($jsonPath)) {
            unlink($jsonPath);
        }

        return true;
    }

    /**
     * @return array<string, array<string, string>>
     */
    private static function readInstalledFamilies(string $fontDir): array
    {
        $path = $fontDir.DIRECTORY_SEPARATOR.'installed-fonts.json';
        if (! is_file($path)) {
            return [];
        }

        $decoded = json_decode((string) file_get_contents($path), true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param  array<string, array<string, string>>  $families
     */
    private static function writeInstalledFamilies(string $fontDir, array $families): void
    {
        $path = $fontDir.DIRECTORY_SEPARATOR.'installed-fonts.json';
        file_put_contents(
            $path,
            json_encode($families, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n",
        );
    }
}
