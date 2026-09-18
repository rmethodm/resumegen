// Fictional design fixtures. No account or production resume data is loaded.
export interface Version {
    id: string;
    title: string;
    company: string;
    headline: string;
    summary: string;
    experience: string;
    status: string;
    fullName: string;
    email: string;
    location: string;
    education: string;
    skills: string;
}
const common = {
    fullName: "Jordan Rivera",
    email: "jordan@example.com",
    location: "Austin, TX",
    education: "BFA, Communication Design · State University",
    skills: "Product strategy, Interaction design, Prototyping, Design systems",
};
export const versions: Version[] = [
    {
        ...common,
        id: "base",
        title: "General resume",
        company: "No specific company",
        headline: "Senior Product Designer",
        summary:
            "Product designer focused on making complex software feel simple. I bring research, systems thinking, and close engineering collaboration to every stage of product development.",
        experience:
            "Led the redesign of a workflow platform, helping teams finish everyday tasks with fewer steps.\nBuilt a shared design system with engineering and product partners.\nMentored designers through research, critique, and delivery.",
        status: "Base",
    },
    {
        ...common,
        id: "linear",
        title: "Linear · Product Designer",
        company: "Linear",
        headline: "Product Designer · Tools for thoughtful teams",
        summary:
            "Product designer creating clear, dependable tools for ambitious teams. Experienced in simplifying complex workflows, building design systems, and partnering closely with engineers to ship polished software.",
        experience:
            "Simplified a core workflow through research and rapid prototyping.\nBuilt reusable patterns that connected design intent with production code.\nLed weekly critique sessions focused on interaction quality and clarity.",
        status: "In progress",
    },
    {
        ...common,
        id: "notion",
        title: "Notion · Senior Designer",
        company: "Notion",
        headline: "Senior Product Designer · Connected workspaces",
        summary:
            "Product designer helping people organize knowledge and work together. I turn flexible systems into approachable experiences through research, clear interaction models, and thoughtful craft.",
        experience:
            "Designed collaborative workflows for distributed product teams.\nCreated a component library that kept experiences consistent.\nPartnered with research to improve first-time onboarding.",
        status: "Ready",
    },
    {
        ...common,
        id: "figma",
        title: "Figma · Design Systems",
        company: "Figma",
        headline: "Product Designer · Design systems",
        summary:
            "Systems-minded product designer building foundations that help teams create better software. I connect reusable components, accessible interaction patterns, and practical documentation.",
        experience:
            "Established reusable components with clear usage guidance.\nImproved accessibility across the core product experience.\nHelped product teams adopt shared patterns through hands-on support.",
        status: "Draft",
    },
];
export const directions = [
    {
        name: "Version rail",
        tag: "Everything in view",
        description:
            "Keep your resume family visible while you edit. Best for frequent switching; uses more horizontal space.",
    },
    {
        name: "Quiet workspace",
        tag: "Focus on the writing",
        description:
            "A searchable version switcher keeps the workspace calm. Best for focused editing; other versions stay tucked away.",
    },
    {
        name: "Guided editor",
        tag: "One section at a time",
        description:
            "A section navigator gives each edit a clear next step. Best for a first pass; slower for jumping between many fields.",
    },
    {
        name: "Compare & refine",
        tag: "See what changed",
        description:
            "Review a tailored version beside its base. Best for checking differences; editing happens in a side sheet.",
    },
    {
        name: "Version library",
        tag: "Choose, then work",
        description:
            "A compact version table sits above the editor. Best for managing several applications; takes more vertical space.",
    },
];
