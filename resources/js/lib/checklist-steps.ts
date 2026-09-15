export type ChecklistFacts = {
    has_starter_profile: boolean;
    resume_count: number;
    extension_connected: boolean;
    job_count: number;
    applied_count: number;
};

export type ChecklistStep = {
    key: 'profile' | 'resume' | 'extension' | 'job' | 'applied';
    label: string;
    done: boolean;
    /** Named route to send the user to for this step. */
    route: string;
};

export function checklistSteps(facts: ChecklistFacts): ChecklistStep[] {
    return [
        { key: 'profile', label: 'Fill your starter profile', done: facts.has_starter_profile, route: 'starter-profile.edit' },
        { key: 'resume', label: 'Build your first resume', done: facts.resume_count > 0, route: 'resumes.index' },
        { key: 'extension', label: 'Connect the browser extension', done: facts.extension_connected, route: 'extension.connect' },
        { key: 'job', label: 'Add your first job', done: facts.job_count > 0, route: 'job-applications.index' },
        { key: 'applied', label: 'Mark an application as Applied', done: facts.applied_count > 0, route: 'job-applications.index' },
    ];
}
