/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import {
    htmlListToMarkdownLines,
    markdownLinesToHtmlList,
    markdownToPlainText,
    markdownToSafeInlineHtml,
} from '@/lib/bullet-markdown';

describe('bullet-markdown', () => {
    it('round-trips markdown lines through list HTML', () => {
        const lines = ['Shipped **feature X**', 'Led [team](https://acme.test)'];
        const html = markdownLinesToHtmlList(lines);
        const back = htmlListToMarkdownLines(html);

        expect(back[0]).toContain('**feature X**');
        expect(back[1]).toContain('[team](https://acme.test)');
    });

    it('renders safe inline HTML for preview', () => {
        const html = markdownToSafeInlineHtml('**bold** and [x](https://a.com)');

        expect(html).toContain('<strong>bold</strong>');
        expect(html).toContain('href="https://a.com"');
        expect(html).not.toContain('onclick');
        expect(html).not.toContain('javascript:');
    });

    it('strips markers for plain text', () => {
        expect(markdownToPlainText('**bold** [Acme](https://a.com)')).toBe(
            'bold Acme',
        );
    });

    it('does not treat **bold** as a list marker', () => {
        expect(markdownToSafeInlineHtml('**bold** ship')).toContain(
            '<strong>bold</strong>',
        );
    });

    it('drops empty list items on serialize', () => {
        expect(htmlListToMarkdownLines('<ul><li><p></p></li></ul>')).toEqual([]);
    });
});
