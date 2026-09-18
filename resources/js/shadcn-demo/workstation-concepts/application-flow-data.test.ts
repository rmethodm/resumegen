import { describe, expect, it } from "vitest";
import {
    prepare,
    bases,
    listings,
    editDraft,
    applyReviewed,
    confirmSubmission,
    sampleSuggestions,
} from "./application-flow-data";

describe("application preparation preview", () => {
    const start = () => prepare([], listings[0], bases[0])[0];
    it("keeps the chosen base and job snapshot independent and resumes existing preparation", () => {
        const base = { ...bases[1] };
        const job = {
            ...listings[0],
            requirements: [...listings[0].requirements],
        };
        const apps = prepare([], job, base);
        base.summary = "Later base edit";
        job.requirements.push("New requirement");
        expect(apps[0].draft.summary).toBe(bases[1].summary);
        expect(apps[0].job.requirements).toEqual(listings[0].requirements);
        expect(prepare(apps, job, bases[0])).toBe(apps);
    });
    it("does not apply pending decisions and applies only accepted suggestions", () => {
        const app = start();
        app.suggestions = sampleSuggestions(app.draft);
        expect(applyReviewed(app)).toBe(app);
        app.suggestions[0].decision = "accept";
        app.suggestions[1].decision = "reject";
        const next = applyReviewed(app);
        expect(next.draft.summary).toBe(app.suggestions[0].after);
        expect(next.draft.experience).toBe(app.draft.experience);
        expect(next.checkpoint).toEqual(app.draft);
        expect(bases[0].summary).toBe(app.draft.summary);
    });
    it("invalidates readiness and stale suggestions after a manual edit", () => {
        const app = { ...start(), status: "Ready" as const };
        app.suggestions = sampleSuggestions(app.draft);
        const next = editDraft(app, "summary", "Manual change");
        expect(next.status).toBe("Preparing");
        expect(next.suggestions).toEqual([]);
        const stale = {
            ...app,
            draft: { ...app.draft, summary: "New text" },
            suggestions: app.suggestions.map((s) => ({
                ...s,
                decision: "accept" as const,
            })),
        };
        expect(applyReviewed(stale)).toBe(stale);
    });
    it("requires readiness and explicit confirmation, then freezes the submitted resume", () => {
        const app = start();
        expect(confirmSubmission(app, "2026-09-18")).toBe(app);
        const ready = { ...app, status: "Ready" as const };
        expect(ready.submitted).toBeUndefined();
        const sent = confirmSubmission(ready, "2026-09-18");
        ready.draft.summary = "Later edit";
        expect(sent.submitted?.resume.summary).not.toBe("Later edit");
        expect(sent.status).toBe("Applied");
        expect(editDraft(sent, "summary", "Overwrite")).toBe(sent);
        expect(confirmSubmission(sent, "later")).toBe(sent);
    });
});
