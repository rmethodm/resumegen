import type { ResumeDraft } from '@/types';

/**
 * Signature of presentation fields that change DomPDF output without
 * editing body copy. Used to refresh the Review → PDF iframe.
 */
export function resumeFormattingKey(
    draft: Pick<
        ResumeDraft,
        | 'template'
        | 'font'
        | 'density'
        | 'skills_layout'
        | 'bullet_style'
        | 'section_order'
    >,
): string {
    return [
        draft.template,
        draft.font,
        draft.density,
        draft.skills_layout,
        draft.bullet_style,
        draft.section_order.join(','),
    ].join('|');
}
