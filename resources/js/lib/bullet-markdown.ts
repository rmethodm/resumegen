import { marked } from 'marked';
import TurndownService from 'turndown';

marked.setOptions({ gfm: true, breaks: false });

const turndown = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
});

/**
 * Strip list markers people paste from Word/Docs/Markdown.
 * Require whitespace after `-` / `*` so `**bold**` is not eaten as a bullet.
 */
export function cleanBulletLine(line: string): string {
    return line
        .replace(/^\s*[•]\s*/, '')
        .replace(/^\s*[-*]\s+/, '')
        .replace(/^\s*\d+[.)]\s+/, '')
        .trimEnd();
}

/** Split clipboard / bulk text into one bullet per non-empty line. */
export function splitBulletLines(text: string): string[] {
    return text
        .split(/\r?\n/)
        .map(cleanBulletLine)
        .filter((line) => line.trim() !== '');
}

/**
 * Keep only strong/em/a (normalize b→strong, i→em). Drop event handlers and
 * javascript: links so preview/PDF never trust TipTap HTML wholesale.
 */
export function allowlistedInlineHtml(html: string): string {
    const withNormalized = html
        .replace(/<\/?b\b[^>]*>/gi, (tag) =>
            tag.startsWith('</') ? '</strong>' : '<strong>',
        )
        .replace(/<\/?i\b[^>]*>/gi, (tag) =>
            tag.startsWith('</') ? '</em>' : '<em>',
        );

    const doc = new DOMParser().parseFromString(
        `<div>${withNormalized}</div>`,
        'text/html',
    );
    const root = doc.body.firstElementChild;

    if (!root) {
        return '';
    }

    return serializeAllowlisted(root);
}

function serializeAllowlisted(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
        return escapeHtml(node.textContent ?? '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(el.childNodes).map(serializeAllowlisted).join('');

    if (tag === 'strong' || tag === 'em') {
        return `<${tag}>${inner}</${tag}>`;
    }

    if (tag === 'a') {
        const href = el.getAttribute('href') ?? '';
        if (!isSafeHref(href)) {
            return inner;
        }

        return `<a href="${escapeHtml(href)}">${inner}</a>`;
    }

    // Unknown wrappers (span, p inside li) — keep children only.
    return inner;
}

function isSafeHref(href: string): boolean {
    const trimmed = href.trim();

    return /^(https?:\/\/|mailto:|\/|#)/i.test(trimmed);
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

/** One markdown bullet → safe inline HTML for preview. */
export function markdownToSafeInlineHtml(markdown: string): string {
    const raw = marked.parseInline(cleanBulletLine(markdown), {
        async: false,
    }) as string;

    return allowlistedInlineHtml(raw);
}

/** TipTap document HTML (`<ul><li>…`) → markdown lines. */
export function htmlListToMarkdownLines(html: string, max = 12): string[] {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const items = Array.from(doc.querySelectorAll('li'));

    if (items.length === 0) {
        return [];
    }

    const lines = items
        .map((li) => {
            const paragraph = li.querySelector('p');
            const inner = paragraph?.innerHTML ?? li.innerHTML;
            const md = cleanBulletLine(turndown.turndown(inner)).trim();

            return md.slice(0, 500);
        })
        .filter((line) => line !== '');

    return lines.slice(0, max);
}

/** Markdown lines → TipTap list HTML. */
export function markdownLinesToHtmlList(lines: string[]): string {
    const rows = lines.length === 0 ? [''] : lines;

    const items = rows
        .map((line) => {
            const inline = allowlistedInlineHtml(
                marked.parseInline(cleanBulletLine(line), {
                    async: false,
                }) as string,
            );

            return `<li><p>${inline || '<br>'}</p></li>`;
        })
        .join('');

    return `<ul>${items}</ul>`;
}

/** Strip markdown markers for ATS / plain-text surfaces. */
export function markdownToPlainText(markdown: string): string {
    const html = markdownToSafeInlineHtml(markdown);
    const doc = new DOMParser().parseFromString(
        `<div>${html}</div>`,
        'text/html',
    );

    return (doc.body.textContent ?? '').trim();
}
