import type { ResumeTemplateKey } from '@/types';

/**
 * Compact chrome for the template picker thumbnails — not a full style port.
 * Colours and layout cues mirror resume-preview.tsx.
 */
export type TemplateThumbStyle = {
    align: 'left' | 'center';
    nameColor: string;
    subColor: string;
    headingColor: string;
    accent: string;
    headerBg?: string;
    pageAccent?: string;
    entryStyle?: 'default' | 'stacked' | 'cards' | 'ruled';
};

export const templateThumbStyles: Record<ResumeTemplateKey, TemplateThumbStyle> = {
    'ats-plain': {
        align: 'left',
        nameColor: '#111',
        subColor: '#000',
        headingColor: '#16161f',
        accent: '#bbbbbb',
        entryStyle: 'stacked',
    },
    classic: {
        align: 'center',
        nameColor: '#181818',
        subColor: '#333',
        headingColor: '#181818',
        accent: '#181818',
        entryStyle: 'ruled',
    },
    modern: {
        align: 'left',
        nameColor: '#111',
        subColor: '#444',
        headingColor: '#181818',
        accent: '#181818',
        headerBg: '#f5f5f5',
        pageAccent: '#181818',
        entryStyle: 'stacked',
    },
    minimalist: {
        align: 'left',
        nameColor: '#111',
        subColor: '#71717a',
        headingColor: '#a1a1aa',
        accent: '#d4d4d8',
        entryStyle: 'stacked',
    },
};
