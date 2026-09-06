export type MarketingStep = {
    n: string;
    title: string;
    desc: string;
};

export type MarketingFaq = {
    question: string;
    answer: string;
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

export const FAQS = [
    {
        question: 'Is Resumegen really free?',
        answer: 'Yes. Templates, exports, share links, and application tracking are unlimited for every account. There is no upgrade tier.',
    },
    {
        question: 'What file formats can I export?',
        answer: 'Download your resume as a PDF or a DOCX file, generated from the same content you edit in the live preview.',
    },
    {
        question: 'Can recruiters view my resume without an account?',
        answer: 'Yes. Share links open in the browser with no sign-up required, and you can gate a link behind an email or password if you want to.',
    },
    {
        question: 'How does the job-match score work?',
        answer: 'Paste a job description into the Optimize tab and Resumegen compares its keywords against your resume, section by section.',
    },
] as const satisfies readonly MarketingFaq[];
