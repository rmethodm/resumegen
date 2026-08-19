export type MarketingFeature = {
    title: string;
    desc: string;
    tag: string;
    /** Tailwind span class, e.g. 'sm:col-span-2' or '' */
    span: string;
};

export type MarketingStep = {
    n: string;
    title: string;
    desc: string;
};

export type MarketingFaqItem = {
    question: string;
    answer: string;
};

export type MarketingProofItem = {
    num: string;
    label: string;
};

export const LOGO_STRIP_LABEL =
    'Built for candidates who want a sharp document — not another subscription';

export const PROOF_ITEMS = [
    { num: 'Free', label: 'forever' },
    { num: '4', label: 'templates' },
    { num: 'PDF + DOCX', label: 'export' },
    { num: 'No card', label: 'required' },
] as const satisfies readonly MarketingProofItem[];

export const FEATURES = [
    {
        title: 'ATS-friendly templates',
        desc: 'Four clean themes — ATS Plain, Classic Serif, Modern Sans, Minimalist — tuned for real hiring systems.',
        tag: '4 templates',
        span: 'sm:col-span-2',
    },
    {
        title: 'PDF & DOCX export',
        desc: 'Download print-ready PDF or editable DOCX with no watermarks and no limits.',
        tag: 'Unlimited',
        span: '',
    },
    {
        title: 'Share links',
        desc: 'Send a live link. Optional password, email gate, expiry, and download control — without publishing a public profile.',
        tag: 'Private by default',
        span: '',
    },
    {
        title: 'Versions & compare',
        desc: 'Keep tailored versions of the same resume, score them, and compare side by side before you apply.',
        tag: 'Built in',
        span: 'sm:col-span-2',
    },
] as const satisfies readonly MarketingFeature[];

export const STEPS = [
    {
        n: '01',
        title: 'Start from a template',
        desc: 'Pick a layout and fill sections in a live editor. Your starter profile can pre-fill the basics so you are not staring at a blank page.',
    },
    {
        n: '02',
        title: 'Tighten the story',
        desc: 'Reorder sections, polish bullets, and open Review to see the resume as a document before you send it anywhere.',
    },
    {
        n: '03',
        title: 'Export or share',
        desc: 'Download PDF or DOCX, or send a gated link recruiters can open without an account.',
    },
] as const satisfies readonly MarketingStep[];

export const FAQ_ITEMS = [
    {
        question: 'Is Resumegen really free?',
        answer:
            'Yes. Every template, export, and share-link feature is free forever — no credit card, no plan tiers, no watermark. Optional AI assist may be rate-limited to control provider cost, not to upsell a paid tier.',
    },
    {
        question: 'Will my resume pass ATS systems?',
        answer:
            'Resumegen ships clean, single-column-friendly templates and semantic section structure aimed at common applicant tracking parsers. Always verify against the employer’s posting requirements.',
    },
    {
        question: 'Can I share a resume without making it public?',
        answer:
            'Yes. Share links support optional password, email gate, expiry, and download control so you decide who can open the document.',
    },
    {
        question: 'What can I export?',
        answer:
            'Download print-ready PDF or editable DOCX anytime. There is no export quota.',
    },
    {
        question: 'Is my data private?',
        answer:
            'Your resumes stay in your account. Public share pages only expose what you explicitly share through a link you control.',
    },
    {
        question: 'Do I need AI to use Resumegen?',
        answer:
            'No. You can build, export, and share without AI. When AI is enabled on the server, rewrite/summary/match tools are available inside the editor under a monthly usage cap.',
    },
] as const satisfies readonly MarketingFaqItem[];

export const ORIGIN = {
    eyebrow: 'Why Resumegen exists',
    title: 'A resume builder without the paywall',
    paragraphs: [
        'Most resume tools bury the basics behind trials and “Pro” tiers. Resumegen is built so anyone can make a polished resume, export it, and share it — without picking a plan.',
        'We focus on the document workflow that actually matters: clean templates, a live editor, PDF and DOCX export, and gated share links you control. Free forever means free forever.',
    ],
    imageSrc: '/images/templates/modern.png',
    imageAlt: 'Sample Resumegen resume template preview',
} as const;
