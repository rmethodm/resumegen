import { describe, expect, it } from 'vitest';
import { checklistSteps, type ChecklistFacts } from './checklist-steps';

const none: ChecklistFacts = {
    has_starter_profile: false,
    resume_count: 0,
    extension_connected: false,
    job_count: 0,
    applied_count: 0,
};

describe('checklistSteps', () => {
    it('lists five steps in order, all incomplete for a fresh account', () => {
        const steps = checklistSteps(none);
        expect(steps.map((s) => s.key)).toEqual(['profile', 'resume', 'extension', 'job', 'applied']);
        expect(steps.every((s) => !s.done)).toBe(true);
    });

    it('marks steps done from facts', () => {
        const steps = checklistSteps({ ...none, has_starter_profile: true, resume_count: 2, applied_count: 1 });
        expect(steps.find((s) => s.key === 'profile')?.done).toBe(true);
        expect(steps.find((s) => s.key === 'resume')?.done).toBe(true);
        expect(steps.find((s) => s.key === 'extension')?.done).toBe(false);
        expect(steps.find((s) => s.key === 'applied')?.done).toBe(true);
    });

    it('reports completion when every step is done', () => {
        const steps = checklistSteps({ has_starter_profile: true, resume_count: 1, extension_connected: true, job_count: 1, applied_count: 1 });
        expect(steps.every((s) => s.done)).toBe(true);
    });
});
