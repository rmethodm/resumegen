import { describe, expect, it } from "vitest";
import {
    copyDraft,
    drafts,
    findEvidence,
    jobs,
    type Draft,
} from "./round-two-data";

function blank(overrides: Partial<Draft> = {}): Draft {
    return {
        ...drafts[0],
        headline: "",
        summary: "",
        experience: "",
        skills: "",
        ...overrides,
    };
}
describe("workstation concept evidence matching", () => {
    it("matches phrases across punctuation without matching partial words", () => {
        const result = findEvidence(
            blank({ summary: "User-research informed art direction." }),
            {
                ...jobs[0],
                requirements: [
                    "user research",
                    "art",
                    "researcher",
                    "directional",
                ],
            },
        );
        expect(result.filter((r) => r.found).map((r) => r.term)).toEqual([
            "user research",
            "art",
        ]);
        expect(result[0].quote).toBe("User-research informed art direction.");
        expect(result[0].section).toBe("Summary");
    });
    it("does not treat version names, target jobs, or contact data as experience", () => {
        const result = findEvidence(
            blank({
                name: "React",
                jobId: "React",
                email: "React@example.com",
            }),
            { ...jobs[0], requirements: ["React"] },
        );
        expect(result[0].found).toBe(false);
        expect(result[0].quote).toBeUndefined();
    });
    it("handles empty and punctuation-only requirement input without evidence claims", () => {
        expect(findEvidence(blank(), { ...jobs[0], requirements: [] })).toEqual(
            [],
        );
        expect(
            findEvidence(blank(), { ...jobs[0], requirements: ["---"] })[0]
                .found,
        ).toBe(false);
    });
    it("does not join separate bullets into invented phrase evidence", () => {
        const result = findEvidence(
            blank({ experience: "Built a design\nSystems improved" }),
            { ...jobs[0], requirements: ["design systems"] },
        );
        expect(result[0].found).toBe(false);
    });
    it("keeps a tailored copy independent of its source", () => {
        const source = { ...drafts[0] };
        const copy = copyDraft(source, "copy", "Tailored for Harbor", "harbor");
        copy.summary = "An independent edit";
        expect(source.summary).toBe(drafts[0].summary);
        expect(source.jobId).toBeNull();
        expect(copy.jobId).toBe("harbor");
    });
});
