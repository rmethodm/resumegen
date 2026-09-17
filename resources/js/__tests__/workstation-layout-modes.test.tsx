/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { routerPatch, autosaveState } = vi.hoisted(() => ({
    routerPatch: vi.fn(),
    autosaveState: {
        status: 'saved',
        offline: false,
        conflict: false,
        errorMessage: null,
    },
}));

vi.stubGlobal('route', (name: string) => `${name}-url`);

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ children }: { children?: React.ReactNode }) => <a>{children}</a>,
    router: { patch: routerPatch, post: vi.fn(), reload: vi.fn(), get: vi.fn() },
    usePage: () => ({
        props: {
            auth: { user: { workstation_layout: 'inline' } },
            aiCredits: null,
        },
    }),
}));

vi.mock('@/hooks/use-autosave', () => ({
    useAutosave: () => ({ ...autosaveState, retry: vi.fn() }),
}));

vi.mock('@/Layouts/AuthenticatedLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
}));

// Lives outside `Pages/` on purpose: `development-pages.ts` eagerly globs
// `../Pages/**/*.tsx`, so a .tsx test file under Pages is imported into the
// running app and crashes it on `vi.mock`.
import Workstation from '@/Pages/Resumes/Workstation';
import type { ResumePageDocument } from '@/types';

function baseResume(): ResumePageDocument {
    return {
        id: 1,
        title: 'My Resume',
        updated_at: '2026-09-16T00:00:00Z',
        section_order: ['contact', 'summary', 'experience'],
        full_name: 'Jane Doe',
        headline: '',
        summary: '',
        experiences: [],
        projects: [],
        education: [],
        certificates: [],
        skills: [],
        target_role: '',
        target_company: '',
        target_job_description: '',
        template: 'classic',
        font: 'inter',
        density: 'balanced',
        bullet_style: 'bullet',
        skills_layout: 'inline',
        email: 'jane@example.com',
        phone: '',
        ai_review: [
            {
                id: 's1',
                label: 'Tighten the summary opener',
                severity: 'high',
                section: 'summary',
                detail: 'Leads with a title instead of an outcome.',
            },
        ],
        ai_review_generated_at: null,
        ai_review_preset: null,
    } as unknown as ResumePageDocument;
}

describe('Workstation Inline layout mode', () => {
    beforeEach(() => {
        routerPatch.mockClear();
    });

    it('shows the AI suggestion attached under its matching section, with no separate Optimize tab', () => {
        render(
            <Workstation resume={baseResume()} skillLibrary={[]} share={null} />,
        );

        expect(
            screen.queryByRole('tab', { name: 'Optimize' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText('Tighten the summary opener'),
        ).toBeInTheDocument();
    });
});
