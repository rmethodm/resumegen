import { drafts, jobs, type Draft, type Job } from "./round-two-data";

export type Listing = Job & { url: string; source: "Imported" | "Manual" };
export const listings: Listing[] = jobs.map((job) => ({
    ...job,
    url: "https://example.com",
    source: "Imported",
}));
export const bases: Draft[] = [
    { ...drafts[0], id: "product", name: "Product design · Default" },
    { ...drafts[2], id: "systems", name: "Design systems", jobId: null },
];
export const stages = [
    "Applied",
    "Screening",
    "Interviewing",
    "Offer",
    "Rejected",
    "Withdrawn",
] as const;
export type Stage = (typeof stages)[number];
export type Suggestion = {
    field: "summary" | "experience";
    before: string;
    after: string;
    reason: string;
    decision: "pending" | "accept" | "reject";
};
export interface Application {
    id: string;
    job: Listing;
    baseId: string;
    draft: Draft;
    status: "Preparing" | "Ready" | Stage;
    suggestions: Suggestion[];
    checkpoint?: Draft;
    submitted?: { resume: Draft; at: string };
    notes: string;
    followUp: string;
    events: string[];
}
export function prepare(
    applications: Application[],
    job: Listing,
    base: Draft,
): Application[] {
    if (applications.some((app) => app.job.id === job.id)) return applications;
    return [
        ...applications,
        {
            id: job.id,
            job: { ...job, requirements: [...job.requirements] },
            baseId: base.id,
            draft: {
                ...base,
                id: `${job.id}-resume`,
                jobId: job.id,
                name: `${job.company} · ${job.role}`,
            },
            status: "Preparing",
            suggestions: [],
            notes: "",
            followUp: "",
            events: ["Created a tailored copy"],
        },
    ];
}
export function editDraft(
    app: Application,
    field: keyof Draft,
    value: string,
): Application {
    if (app.submitted) return app;
    return {
        ...app,
        status: "Preparing",
        draft: { ...app.draft, [field]: value },
        suggestions: [],
    };
}
export function applyReviewed(app: Application): Application {
    if (
        app.submitted ||
        !app.suggestions.length ||
        app.suggestions.some(
            (s) => s.decision === "pending" || app.draft[s.field] !== s.before,
        )
    )
        return app;
    const draft = { ...app.draft };
    app.suggestions
        .filter((s) => s.decision === "accept")
        .forEach((s) => {
            draft[s.field] = s.after;
        });
    return {
        ...app,
        draft,
        checkpoint: { ...app.draft },
        suggestions: [],
        status: "Preparing",
        events: [...app.events, "Applied reviewed suggestions"],
    };
}
export function confirmSubmission(app: Application, at: string): Application {
    if (app.status !== "Ready" || app.submitted) return app;
    return {
        ...app,
        status: "Applied",
        submitted: { resume: { ...app.draft }, at },
        events: [...app.events, "Submission confirmed by you"],
    };
}
export function sampleSuggestions(draft: Draft): Suggestion[] {
    return [
        {
            field: "summary",
            before: draft.summary,
            after: draft.summary
                .split(/(?<=\.)\s+/)
                .reverse()
                .join(" "),
            reason: "Preview suggestion: lead with your working approach. The same source sentences are retained; no qualifications are added.",
            decision: "pending",
        },
        {
            field: "experience",
            before: draft.experience,
            after: draft.experience.split("\n").reverse().join("\n"),
            reason: "Preview suggestion: try a different order for your existing experience. Review whether this puts the most relevant evidence first.",
            decision: "pending",
        },
    ].filter((s) => s.before !== s.after) as Suggestion[];
}
