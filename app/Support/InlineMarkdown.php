<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMText;
use Illuminate\Support\Str;

/**
 * Limited Markdown for resume bullets: bold, italic, and links only.
 * Same vocabulary the TipTap editor persists into experience/project string[].
 */
final class InlineMarkdown
{
    /**
     * Safe HTML for PDF / HTML surfaces (strong, em, a).
     */
    public static function toHtml(string $markdown): string
    {
        $markdown = trim($markdown);

        if ($markdown === '') {
            return '';
        }

        // CommonMark leaves a trailing newline on inline renders — strip it so
        // DOCX/plain text do not pick up an accidental break.
        return rtrim(Str::inlineMarkdown($markdown, [
            'html_input' => 'strip',
            'allow_unsafe_links' => false,
        ]));
    }

    /**
     * Plain text for ATS / scoring (markers stripped).
     */
    public static function toPlain(string $markdown): string
    {
        $html = self::toHtml($markdown);

        if ($html === '') {
            return '';
        }

        return html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /**
     * Inline segments for the DOCX writer (bold / italic / optional href).
     *
     * @return list<array{text: string, bold: bool, italic: bool, href: string|null}>
     */
    public static function toRuns(string $markdown): array
    {
        $html = self::toHtml($markdown);

        if ($html === '') {
            return [];
        }

        $dom = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        $dom->loadHTML(
            '<!DOCTYPE html><html><body><div id="rg-md-root">'.$html.'</div></body></html>',
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $root = $dom->getElementById('rg-md-root');

        if (! $root instanceof DOMElement) {
            return [['text' => self::toPlain($markdown), 'bold' => false, 'italic' => false, 'href' => null]];
        }

        $runs = [];
        self::walk($root, false, false, null, $runs);

        return array_values(array_filter(
            $runs,
            static fn (array $run): bool => $run['text'] !== '',
        ));
    }

    /**
     * @param  list<array{text: string, bold: bool, italic: bool, href: string|null}>  $runs
     */
    private static function walk(
        DOMNode $node,
        bool $bold,
        bool $italic,
        ?string $href,
        array &$runs,
    ): void {
        if ($node instanceof DOMText) {
            $runs[] = [
                'text' => $node->wholeText,
                'bold' => $bold,
                'italic' => $italic,
                'href' => $href,
            ];

            return;
        }

        if (! $node instanceof DOMElement) {
            return;
        }

        $tag = strtolower($node->tagName);
        $nextBold = $bold || in_array($tag, ['strong', 'b'], true);
        $nextItalic = $italic || in_array($tag, ['em', 'i'], true);
        $nextHref = $href;

        if ($tag === 'a') {
            $candidate = trim((string) $node->getAttribute('href'));
            if (self::isSafeHref($candidate)) {
                $nextHref = $candidate;
            }
        }

        foreach ($node->childNodes as $child) {
            self::walk($child, $nextBold, $nextItalic, $nextHref, $runs);
        }
    }

    private static function isSafeHref(string $href): bool
    {
        return (bool) preg_match('/^(https?:\/\/|mailto:|\/|#)/i', $href);
    }
}
