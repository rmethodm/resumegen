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
    minimal: {
        align: 'center',
        nameColor: '#181818',
        subColor: '#333',
        headingColor: '#444',
        accent: '#1f2933',
    },
    modern: {
        align: 'left',
        nameColor: '#312e81',
        subColor: '#4338ca',
        headingColor: '#4f46e5',
        accent: '#4f46e5',
        headerBg: '#eef2ff',
        pageAccent: '#4f46e5',
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
    executive: {
        align: 'left',
        nameColor: '#0f172a',
        subColor: '#475569',
        headingColor: '#0f172a',
        accent: '#0f172a',
        pageAccent: '#0f172a',
    },
    ats: {
        align: 'left',
        nameColor: '#000',
        subColor: '#000',
        headingColor: '#000',
        accent: '#000',
        entryStyle: 'stacked',
    },
    'skills-first': {
        align: 'center',
        nameColor: '#047857',
        subColor: '#444',
        headingColor: '#059669',
        accent: '#059669',
        headerBg: '#ecfdf5',
        pageAccent: '#059669',
    },
    'reverse-chronological': {
        align: 'left',
        nameColor: '#111',
        subColor: '#2b4570',
        headingColor: '#16161f',
        accent: '#2b4570',
        entryStyle: 'ruled',
    },
    'ats-plain': {
        align: 'left',
        nameColor: '#111',
        subColor: '#000',
        headingColor: '#16161f',
        accent: '#bbbbbb',
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
    engineering: {
        align: 'left',
        nameColor: '#0f172a',
        subColor: '#1e3a5f',
        headingColor: '#1e3a5f',
        accent: '#1e3a5f',
        pageAccent: '#1e3a5f',
    },
    'ivy-serif': {
        align: 'center',
        nameColor: '#111',
        subColor: '#111',
        headingColor: '#16161f',
        accent: '#14161a',
        entryStyle: 'ruled',
    },
    clinical: {
        align: 'left',
        nameColor: '#0e5b5b',
        subColor: '#0e5b5b',
        headingColor: '#0e5b5b',
        accent: '#0e5b5b',
        headerBg: '#f0fdfa',
        entryStyle: 'stacked',
    },
    'career-change': {
        align: 'left',
        nameColor: '#312e81',
        subColor: '#4338ca',
        headingColor: '#4338ca',
        accent: '#4338ca',
        entryStyle: 'cards',
    },
    'entry-level': {
        align: 'left',
        nameColor: '#312e81',
        subColor: '#3730a3',
        headingColor: '#3730a3',
        accent: '#3730a3',
        headerBg: '#eef2ff',
        entryStyle: 'cards',
    },
    'metric-cards': {
        align: 'left',
        nameColor: '#111',
        subColor: '#4f46e5',
        headingColor: '#4f46e5',
        accent: '#4f46e5',
        pageAccent: '#4f46e5',
        entryStyle: 'cards',
    },
    'sales-quota-table': {
        align: 'left',
        nameColor: '#111',
        subColor: '#b45309',
        headingColor: '#92400e',
        accent: '#b45309',
        pageAccent: '#b45309',
        entryStyle: 'ruled',
    },
    federal: {
        align: 'left',
        nameColor: '#000',
        subColor: '#000',
        headingColor: '#000',
        accent: '#000',
        entryStyle: 'stacked',
    },
    'academic-cv': {
        align: 'center',
        nameColor: '#111',
        subColor: '#333',
        headingColor: '#16161f',
        accent: '#111',
        entryStyle: 'stacked',
    },
    'accent-rule': {
        align: 'left',
        nameColor: '#111',
        subColor: '#4338ca',
        headingColor: '#4338ca',
        accent: '#4338ca',
        pageAccent: '#4338ca',
    },
    'consulting-ledger': {
        align: 'left',
        nameColor: '#111',
        subColor: '#14161a',
        headingColor: '#16161f',
        accent: '#14161a',
        entryStyle: 'ruled',
    },
    education: {
        align: 'left',
        nameColor: '#14532d',
        subColor: '#1f4d3a',
        headingColor: '#166534',
        accent: '#1f4d3a',
        headerBg: '#f0fdf4',
        entryStyle: 'stacked',
    },
    'startup-one-pager': {
        align: 'left',
        nameColor: '#111',
        subColor: '#4f46e5',
        headingColor: '#4f46e5',
        accent: '#4f46e5',
        headerBg: '#eef2ff',
        entryStyle: 'cards',
    },
    'it-competency-matrix': {
        align: 'left',
        nameColor: '#0f172a',
        subColor: '#1e3a5f',
        headingColor: '#1e3a5f',
        accent: '#1e3a5f',
        pageAccent: '#1e3a5f',
    },
    'centered-traditional': {
        align: 'center',
        nameColor: '#111',
        subColor: '#111',
        headingColor: '#16161f',
        accent: '#111',
        entryStyle: 'ruled',
    },
};
