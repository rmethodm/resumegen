export type MarketingStep = {
    n: string;
    title: string;
    desc: string;
};

export const STEPS = [
    {
        n: '01',
        title: 'Start from a template',
        desc: 'Pick a layout and fill sections in a live editor. Your starter profile pre-fills the basics.',
    },
    {
        n: '02',
        title: 'Tighten the story',
        desc: 'Reorder sections, polish bullets, and preview the document before you send it anywhere.',
    },
    {
        n: '03',
        title: 'Export or share',
        desc: 'Download PDF or DOCX, or send a gated link recruiters can open without an account.',
    },
] as const satisfies readonly MarketingStep[];
