// Fictional jobs, candidate, and evidence for isolated design exploration.
export type Stage = "Saved" | "Tailoring" | "Ready";
export interface Job {
    id: string;
    company: string;
    role: string;
    location: string;
    remote: boolean;
    description: string;
    requirements: string[];
    stage: Stage;
}
export interface Draft {
    id: string;
    name: string;
    jobId: string | null;
    headline: string;
    summary: string;
    experience: string;
    skills: string;
    email: string;
}
export const jobs: Job[] = [
    {
        id: "harbor",
        company: "Harbor",
        role: "Senior Product Designer",
        location: "Remote · US",
        remote: true,
        description:
            "Shape a simpler workspace for growing teams. Partner with product and engineering, conduct user research, and turn complex workflows into approachable tools.",
        requirements: [
            "user research",
            "design systems",
            "prototyping",
            "accessibility",
            "B2B",
        ],
        stage: "Tailoring",
    },
    {
        id: "forma",
        company: "Forma",
        role: "Design Systems Lead",
        location: "New York · Hybrid",
        remote: false,
        description:
            "Build a shared design language across product teams. Establish component patterns, improve accessibility, and help designers grow through mentorship.",
        requirements: [
            "design systems",
            "accessibility",
            "mentorship",
            "documentation",
            "React",
        ],
        stage: "Saved",
    },
    {
        id: "northstar",
        company: "Northstar",
        role: "Staff Product Designer",
        location: "Remote · US",
        remote: true,
        description:
            "Lead complex product initiatives from early strategy through delivery. Guide cross-functional partners and bring customer evidence into key decisions.",
        requirements: [
            "product strategy",
            "user research",
            "B2B",
            "mentorship",
            "data visualization",
        ],
        stage: "Ready",
    },
    {
        id: "arc",
        company: "Arc Studio",
        role: "Interaction Designer",
        location: "San Francisco · Hybrid",
        remote: false,
        description:
            "Make daily interactions feel clear and responsive. Work with engineers on prototypes, motion, and accessible patterns.",
        requirements: [
            "prototyping",
            "interaction design",
            "accessibility",
            "motion design",
        ],
        stage: "Saved",
    },
];
const common = {
    email: "jordan@example.com",
    headline: "Senior Product Designer",
    skills: "User research, Interaction design, Prototyping",
    summary:
        "Product designer making complex B2B software easier to use. I connect user research with thoughtful interaction design and close engineering collaboration.",
    experience:
        "Led user research and prototyping for a team workspace.\nBuilt design systems with reusable components and practical documentation.\nPartnered with engineering to simplify everyday workflows.",
};
export const drafts: Draft[] = [
    { ...common, id: "base", name: "General resume", jobId: null },
    {
        ...common,
        id: "harbor-v1",
        name: "Harbor · Product design",
        jobId: "harbor",
        summary:
            "Product designer focused on clear, dependable B2B workspaces. I connect user research, prototyping, and design systems to help teams work with less friction.",
    },
    {
        ...common,
        id: "forma-v1",
        name: "Forma · Systems lead",
        jobId: "forma",
        summary:
            "Design systems practitioner creating accessible foundations for product teams.",
        experience:
            "Built design systems with reusable components and documentation.\nImproved accessibility through keyboard and screen-reader reviews.\nSupported designers through mentorship and regular critique.",
        skills: "Design systems, Accessibility, Documentation, Mentorship",
    },
    {
        ...common,
        id: "northstar-v1",
        name: "Northstar · Staff designer",
        jobId: "northstar",
        summary:
            "Product designer connecting product strategy with user research for B2B teams.",
        experience:
            "Led product strategy for a complex workspace.\nPartnered with engineers on prototyping.\nSupported teammates through mentorship and critique.",
        skills: "Product strategy, User research, B2B, Mentorship",
    },
];
export const directions = [
    {
        name: "Opportunity desk",
        title: "Your next role, in focus.",
        detail: "Job discovery beside the document. A shortlist that explains why each role fits.",
        value: "Saved preferences + an explained shortlist",
        tradeoff: "Keeps opportunities visible; adds a third column.",
    },
    {
        name: "Match matrix",
        title: "Find the right version for the role.",
        detail: "Compare your resume family against several opportunities in one view.",
        value: "Cross-version matching + reusable evidence",
        tradeoff:
            "Makes comparison fast; best for people managing several versions.",
    },
    {
        name: "Application room",
        title: "One role. Everything ready.",
        detail: "A focused workspace for the resume, preparation, and final checks for one application.",
        value: "Application checklist + interview preparation",
        tradeoff: "Keeps context together; less useful for browsing many jobs.",
    },
    {
        name: "Tailoring review",
        title: "Better wording. Still your story.",
        detail: "Review each proposed change, see its source, and keep control of your resume.",
        value: "Source-backed suggestions + one-click rollback",
        tradeoff: "Builds trust in assistance; each change needs a decision.",
    },
    {
        name: "Opportunity board",
        title: "A little progress, every day.",
        detail: "Move opportunities forward with the right resume attached to every card.",
        value: "Version-aware pipeline + preparation notes",
        tradeoff:
            "Helps organize a search; gives the document less space up front.",
    },
    {
        name: "Submission studio",
        title: "Send something you feel good about.",
        detail: "Give the document one final pass, with evidence and checks close at hand.",
        value: "Submission checks + a portable application brief",
        tradeoff: "Makes final review calm; edits live in a side panel.",
    },
];
export const checklist = [
    "Contact details checked",
    "Job wording reviewed",
    "Resume proofread",
    "Portfolio links checked",
];
export const proposal = {
    source: "Built design systems with reusable components and practical documentation.",
    replacement:
        "Built reusable design systems and practical documentation for product teams.",
    reason: "Lead with the systems work already in your experience. The wording is shorter; the evidence stays the same.",
};
export function normalize(text: string): string {
    return text
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .replace(/\s+/g, " ");
}
export function findEvidence(draft: Draft, job: Job) {
    const sections = [
        { label: "Summary", text: draft.summary },
        { label: "Experience", text: draft.experience },
        { label: "Skills", text: draft.skills },
        { label: "Headline", text: draft.headline },
    ];
    return job.requirements.map((term) => {
        const normalized = normalize(term);
        const evidence = normalized
            ? sections
                  .flatMap((section) =>
                      section.text
                          .split(/\n|(?<=\.)\s/)
                          .map((quote) => ({ section: section.label, quote })),
                  )
                  .find((row) =>
                      ` ${normalize(row.quote)} `.includes(` ${normalized} `),
                  )
            : undefined;
        return {
            term,
            found: !!evidence,
            section: evidence?.section,
            quote: evidence?.quote,
        };
    });
}
export function copyDraft(
    draft: Draft,
    id: string,
    name: string,
    jobId: string,
): Draft {
    return { ...draft, id, name, jobId };
}
