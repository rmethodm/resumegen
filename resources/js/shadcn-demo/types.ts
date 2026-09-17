export type SectionKey =
    | 'contact'
    | 'summary'
    | 'experience'
    | 'education'
    | 'skills'
    | 'projects'
    | 'certificates';

export const OPTIONAL_SECTIONS: SectionKey[] = ['projects', 'certificates'];

export const SECTION_LABELS: Record<SectionKey, string> = {
    contact: 'Contact',
    summary: 'Summary',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    projects: 'Projects',
    certificates: 'Certificates',
};

export interface Experience {
    id: string;
    title: string;
    company: string;
    location: string;
    start: string;
    end: string;
    bullets: string[];
}

export interface Education {
    id: string;
    school: string;
    degree: string;
    location: string;
    start: string;
    end: string;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    highlights: string[];
}

export interface Certificate {
    id: string;
    name: string;
    issuer: string;
    date: string;
}

export interface ResumeDraft {
    full_name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    summary: string;
    skills: string[];
    experiences: Experience[];
    education: Education[];
    projects: Project[];
    certificates: Certificate[];
    section_order: SectionKey[];
    template: 'ats-plain' | 'classic' | 'modern' | 'minimalist';
    density: 'compact' | 'balanced' | 'spacious';
    font: 'inter' | 'arial' | 'georgia';
}

export const SAMPLE_RESUME: ResumeDraft = {
    full_name: 'Jordan Rivera',
    headline: 'Senior Product Designer',
    email: 'jordan.rivera@example.com',
    phone: '(555) 219-4471',
    location: 'Austin, TX',
    website: 'jordanrivera.design',
    summary:
        'Product designer with 8 years shipping design systems and 0-to-1 flows for B2B SaaS. Led a 4-person design team through a platform relaunch that cut onboarding time by 42%.',
    skills: [
        'Figma',
        'Design Systems',
        'User Research',
        'Prototyping',
        'Accessibility',
        'Design Ops',
    ],
    experiences: [
        {
            id: 'e1',
            title: 'Senior Product Designer',
            company: 'Northwind Labs',
            location: 'Austin, TX',
            start: '2022',
            end: 'Present',
            bullets: [
                'Led redesign of the core workflow builder, reducing task completion time by 31%.',
                'Built and shipped a token-based design system adopted across 6 product teams.',
                'Mentored 3 junior designers through weekly critique and pairing sessions.',
            ],
        },
        {
            id: 'e2',
            title: 'Product Designer',
            company: 'Fieldstone',
            location: 'Remote',
            start: '2019',
            end: '2022',
            bullets: [
                'Owned end-to-end design for the billing and invoicing module.',
                'Ran monthly usability studies that informed the 2021 roadmap.',
            ],
        },
    ],
    education: [
        {
            id: 'ed1',
            school: 'University of Texas at Austin',
            degree: 'B.F.A. Design',
            location: 'Austin, TX',
            start: '2013',
            end: '2017',
        },
    ],
    projects: [
        {
            id: 'p1',
            name: 'Component Library Audit',
            description:
                'Independent audit of a 200+ component library, cutting duplicate variants by 60%.',
            highlights: ['Presented findings to leadership', 'Adopted as quarterly process'],
        },
    ],
    certificates: [
        { id: 'c1', name: 'Certified Usability Analyst', issuer: 'HFI', date: '2021' },
    ],
    section_order: [
        'contact',
        'summary',
        'experience',
        'skills',
        'education',
        'projects',
        'certificates',
    ],
    template: 'modern',
    density: 'balanced',
    font: 'inter',
};

export interface DemoNote {
    id: string;
    body: string;
    created_at: string;
}

export interface DemoSnapshot {
    id: string;
    label: string;
    created_at: string;
}

export const SAMPLE_NOTES: DemoNote[] = [
    { id: 'n1', body: 'Cut the Fieldstone bullets down to 2 — too long for one page.', created_at: '2 days ago' },
    { id: 'n2', body: 'Add a link to the design system case study once it is public.', created_at: '5 days ago' },
];

export const SAMPLE_SNAPSHOTS: DemoSnapshot[] = [
    { id: 's1', label: 'Before Northwind rewrite', created_at: 'Sep 10' },
    { id: 's2', label: 'Initial import from LinkedIn', created_at: 'Aug 28' },
];
