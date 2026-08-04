<?php

namespace App\Support;

use RuntimeException;
use ZipArchive;

/**
 * Hand-built .docx from a {@see ResumeExport::build()} view, the same
 * flattened structure the PDF exporter reads — see the class docblock there.
 *
 * ponytail: raw OOXML via ZipArchive rather than phpword, matching the
 * existing choice in DocxText.php for the reverse direction (docx -> text).
 * A .docx is just a zip of XML; a minimal writer needs three parts
 * ([Content_Types].xml, _rels/.rels, word/document.xml), well under what a
 * library dependency would buy here.
 *
 * It does not attempt to reproduce TEMPLATE_STYLES pixel-for-pixel — no
 * letter-spacing or gradient equivalent exists in OOXML, and real numbered
 * bullets need a numbering.xml part this skips in favor of a literal "• "
 * prefix. Heading color/weight/uppercase and a bottom rule (borrowed from
 * the template's accent color) carry over; that is enough for every
 * template to open as a clean, editable, on-brand-ish Word doc. Upgrade to
 * phpword if a byte-for-byte template match is ever required.
 */
final class DocxExport
{
    public static function build(array $doc): string
    {
        $view = ResumeExport::build($doc);

        $body = self::header($view).implode('', array_map(
            fn (array $section): string => self::section($section, $view['style']['heading']),
            $view['sections'],
        ));

        $document = self::documentXml($body);

        $zip = new ZipArchive;
        $path = tempnam(sys_get_temp_dir(), 'docx');

        if ($zip->open($path, ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Could not open a temp file for the .docx.');
        }

        $zip->addFromString('[Content_Types].xml', self::contentTypesXml());
        $zip->addFromString('_rels/.rels', self::relsXml());
        $zip->addFromString('word/document.xml', $document);
        $zip->close();

        $bytes = file_get_contents($path);
        unlink($path);

        return $bytes;
    }

    /**
     * @param  array{name: string, headline: string, contact: string, style: array<string, mixed>}  $view
     */
    private static function header(array $view): string
    {
        $header = $view['style']['header'];
        $align = $header['align'] === 'center' ? 'center' : 'left';
        $name = $header['name_upper'] ? mb_strtoupper($view['name']) : $view['name'];

        $paragraphs = self::paragraph(
            self::run($name, ['b' => true, 'size' => '32', 'color' => self::hex($header['name_color'])]),
            ['align' => $align, 'after' => '40', 'borderColor' => $header['rule'] !== null ? self::hex($header['name_color']) : null],
        );

        if ($view['headline'] !== '') {
            $paragraphs .= self::paragraph(
                self::run($view['headline'], ['i' => true, 'color' => self::hex($header['sub_color'])]),
                ['align' => $align, 'after' => '40'],
            );
        }

        if ($view['contact'] !== '') {
            $paragraphs .= self::paragraph(
                self::run($view['contact'], ['size' => '18', 'color' => self::hex($header['sub_color'])]),
                ['align' => $align, 'after' => '200'],
            );
        }

        return $paragraphs;
    }

    /**
     * @param  array<string, mixed>  $section
     * @param  array{color: string, transform: string, weight: int, rule: string|null}  $heading
     */
    private static function section(array $section, array $heading): string
    {
        $title = $heading['transform'] === 'uppercase' ? mb_strtoupper($section['title']) : $section['title'];

        $out = self::paragraph(
            self::run($title, ['b' => $heading['weight'] >= 700, 'color' => self::hex($heading['color'])]),
            ['before' => '200', 'after' => '80', 'borderColor' => $heading['rule'] !== null ? self::hex($heading['color']) : null],
        );

        $out .= match ($section['kind']) {
            'text' => self::paragraph(self::run($section['text']), ['after' => '120']),
            'entries' => implode('', array_map(
                fn (array $entry): string => self::entry($entry, $section['bullet_style'] ?? 'bullet'),
                $section['entries'],
            )),
            'rows' => implode('', array_map(
                function (array $row): string {
                    $line = trim($row['left'].(($row['right'] ?? '') !== '' ? '  —  '.$row['right'] : ''));
                    $out = self::paragraph(
                        self::run($line),
                        ['after' => ! empty($row['left_sub']) ? '20' : '80'],
                    );
                    if (! empty($row['left_sub'])) {
                        $out .= self::paragraph(
                            self::run($row['left_sub'], ['i' => true, 'size' => '18']),
                            ['after' => '80'],
                        );
                    }

                    return $out;
                },
                $section['rows'],
            )),
            'skills' => self::skills($section),
            default => '',
        };

        return $out;
    }

    /** @param  array{primary: string, secondary: string, dates: string, bullets: list<string>, description?: string}  $entry */
    private static function entry(array $entry, string $bulletStyle = 'bullet'): string
    {
        $out = self::paragraph(
            self::run($entry['primary'], ['b' => true])
                .($entry['dates'] !== '' ? self::run('   '.$entry['dates'], ['i' => true, 'size' => '18']) : ''),
            ['after' => '20'],
        );

        if ($entry['secondary'] !== '') {
            $out .= self::paragraph(self::run($entry['secondary'], ['i' => true]), ['after' => '40']);
        }

        if (($entry['description'] ?? '') !== '') {
            $out .= self::paragraph(self::run($entry['description']), ['after' => '40']);
        }

        // Real numbered/none-marker bullets need a numbering.xml part this
        // writer skips (see the class docblock) — a literal prefix per style
        // is the same trade-off the always-"•" version already made.
        foreach ($entry['bullets'] as $index => $bullet) {
            $prefix = match ($bulletStyle) {
                'numbered' => ($index + 1).'.  ',
                'indented' => '',
                default => '•  ',
            };

            $indentOpts = $bulletStyle === 'indented'
                ? ['after' => '20', 'indentLeft' => '360']
                : ['after' => '20', 'indent' => '360'];

            $out .= self::paragraph(self::run($prefix.$bullet), $indentOpts);
        }

        return $out.self::paragraph('', ['after' => '80']);
    }

    /** @param  array{layout: string, names: list<string>, groups: list<array{category: string, names: list<string>}>}  $section */
    private static function skills(array $section): string
    {
        if ($section['layout'] === 'grouped') {
            return implode('', array_map(
                fn (array $group): string => self::paragraph(
                    ($group['category'] !== '' ? self::run($group['category'].': ', ['b' => true]) : '')
                        .self::run(implode(', ', $group['names'])),
                    ['after' => '60'],
                ),
                $section['groups'],
            ));
        }

        return self::paragraph(self::run(implode(', ', $section['names'])), ['after' => '80']);
    }

    /**
     * @param  array{b?: bool, i?: bool, size?: string, color?: string|null}  $opts
     */
    private static function run(string $text, array $opts = []): string
    {
        $props = '';
        $props .= ($opts['b'] ?? false) ? '<w:b/>' : '';
        $props .= ($opts['i'] ?? false) ? '<w:i/>' : '';
        $props .= isset($opts['color']) ? '<w:color w:val="'.$opts['color'].'"/>' : '';
        $props .= isset($opts['size']) ? '<w:sz w:val="'.$opts['size'].'"/>' : '';
        $rPr = $props !== '' ? "<w:rPr>{$props}</w:rPr>" : '';

        return "<w:r>{$rPr}<w:t xml:space=\"preserve\">".self::escape($text).'</w:t></w:r>';
    }

    /**
     * @param  array{align?: string, before?: string, after?: string, indent?: string, indentLeft?: string, borderColor?: string|null}  $opts
     */
    private static function paragraph(string $runsXml, array $opts = []): string
    {
        $props = '';
        $props .= isset($opts['align']) ? '<w:jc w:val="'.$opts['align'].'"/>' : '';
        $props .= (isset($opts['before']) || isset($opts['after']))
            ? '<w:spacing w:before="'.($opts['before'] ?? '0').'" w:after="'.($opts['after'] ?? '0').'"/>'
            : '';
        // 'indent' is a hanging indent — the marker sits in the reserved
        // space, so wrapped lines align under the text, not the marker.
        // 'indentLeft' has no marker to reserve space for, so every line
        // (including the first) gets the same plain left indent instead.
        $props .= isset($opts['indent']) ? '<w:ind w:left="'.$opts['indent'].'" w:hanging="'.$opts['indent'].'"/>' : '';
        $props .= isset($opts['indentLeft']) ? '<w:ind w:left="'.$opts['indentLeft'].'"/>' : '';
        $props .= ! empty($opts['borderColor'])
            ? '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="'.$opts['borderColor'].'"/></w:pBdr>'
            : '';

        $pPr = $props !== '' ? "<w:pPr>{$props}</w:pPr>" : '';

        return "<w:p>{$pPr}{$runsXml}</w:p>";
    }

    /** Strips a leading "#" — OOXML colors are bare hex. */
    private static function hex(?string $color): ?string
    {
        return $color === null ? null : ltrim($color, '#');
    }

    private static function escape(string $text): string
    {
        return htmlspecialchars($text, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    private static function documentXml(string $body): string
    {
        return <<<XML
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
        {$body}
        <w:sectPr>
        <w:pgSz w:w="12240" w:h="15840"/>
        <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/>
        </w:sectPr>
        </w:body>
        </w:document>
        XML;
    }

    private static function contentTypesXml(): string
    {
        return <<<'XML'
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        </Types>
        XML;
    }

    private static function relsXml(): string
    {
        return <<<'XML'
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
        </Relationships>
        XML;
    }
}
