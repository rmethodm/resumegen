import type { ResumeTemplateKey } from '@/types';

/**
 * Compact chrome for the template picker thumbnails — not a full style port.
 * Colours mirror the header/heading accents in resume-preview.tsx.
 */
export type TemplateThumbStyle = {
    align: 'left' | 'center';
    nameColor: string;
    subColor: string;
    headingColor: string;
    accent: string;
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
        nameColor: '#4f46e5',
        subColor: '#555',
        headingColor: '#4f46e5',
        accent: '#4f46e5',
    },
    classic: {
        align: 'center',
        nameColor: '#181818',
        subColor: '#333',
        headingColor: '#181818',
        accent: '#181818',
    },
    executive: {
        align: 'left',
        nameColor: '#0f172a',
        subColor: '#475569',
        headingColor: '#0f172a',
        accent: '#0f172a',
    },
    ats: {
        align: 'left',
        nameColor: '#000',
        subColor: '#000',
        headingColor: '#000',
        accent: '#000',
    },
    'skills-first': {
        align: 'center',
        nameColor: '#059669',
        subColor: '#444',
        headingColor: '#059669',
        accent: '#059669',
    },
    'reverse-chronological': {
        align: 'left',
        nameColor: '#111',
        subColor: '#2b4570',
        headingColor: '#16161f',
        accent: '#2b4570',
    },
    'ats-plain': {
        align: 'left',
        nameColor: '#111',
        subColor: '#000',
        headingColor: '#16161f',
        accent: '#bbbbbb',
    },
    minimalist: {
        align: 'left',
        nameColor: '#111',
        subColor: '#71717a',
        headingColor: '#16161f',
        accent: '#111',
    },
    engineering: {
        align: 'left',
        nameColor: '#111',
        subColor: '#1e3a5f',
        headingColor: '#16161f',
        accent: '#1e3a5f',
    },
    'ivy-serif': {
        align: 'center',
        nameColor: '#111',
        subColor: '#111',
        headingColor: '#16161f',
        accent: '#14161a',
    },
    clinical: {
        align: 'left',
        nameColor: '#111',
        subColor: '#0e5b5b',
        headingColor: '#0e5b5b',
        accent: '#0e5b5b',
    },
    'career-change': {
        align: 'left',
        nameColor: '#111',
        subColor: '#4338ca',
        headingColor: '#4338ca',
        accent: '#4338ca',
    },
    'entry-level': {
        align: 'left',
        nameColor: '#111',
        subColor: '#3730a3',
        headingColor: '#16161f',
        accent: '#3730a3',
    },
    'metric-cards': {
        align: 'left',
        nameColor: '#111',
        subColor: '#4f46e5',
        headingColor: '#16161f',
        accent: '#4f46e5',
    },
    'sales-quota-table': {
        align: 'left',
        nameColor: '#111',
        subColor: '#b45309',
        headingColor: '#16161f',
        accent: '#b45309',
    },
    federal: {
        align: 'left',
        nameColor: '#111',
        subColor: '#1f2937',
        headingColor: '#16161f',
        accent: '#1f2937',
    },
    'academic-cv': {
        align: 'left',
        nameColor: '#111',
        subColor: '#111',
        headingColor: '#16161f',
        accent: '#111',
    },
    'accent-rule': {
        align: 'left',
        nameColor: '#111',
        subColor: '#4338ca',
        headingColor: '#4338ca',
        accent: '#4338ca',
    },
    'consulting-ledger': {
        align: 'left',
        nameColor: '#111',
        subColor: '#14161a',
        headingColor: '#16161f',
        accent: '#14161a',
    },
    education: {
        align: 'left',
        nameColor: '#111',
        subColor: '#1f4d3a',
        headingColor: '#16161f',
        accent: '#1f4d3a',
    },
    'startup-one-pager': {
        align: 'left',
        nameColor: '#111',
        subColor: '#4f46e5',
        headingColor: '#16161f',
        accent: '#4f46e5',
    },
    'it-competency-matrix': {
        align: 'left',
        nameColor: '#111',
        subColor: '#1e3a5f',
        headingColor: '#16161f',
        accent: '#1e3a5f',
    },
    'centered-traditional': {
        align: 'center',
        nameColor: '#111',
        subColor: '#111',
        headingColor: '#16161f',
        accent: '#111',
    },
};
