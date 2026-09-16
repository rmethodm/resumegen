/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { router } from '@inertiajs/react';
import ApplyWizard from './Wizard';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ children }: { children: ReactNode }) => createElement('a', null, children),
    router: { patch: vi.fn(), get: vi.fn(), post: vi.fn() },
}));
vi.mock('@/Layouts/AuthenticatedLayout', () => ({
    default: ({ children }: { children: ReactNode }) => children,
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('route', (name: string) => name);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
});

async function click(label: string) {
    const button = [...container.querySelectorAll('button')].find((el) => el.textContent === label);
    expect(button).toBeDefined();
    await act(async () => button!.click());
}

async function fill(index: number, value: string) {
    const input = container.querySelectorAll('input')[index];
    await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
}

async function mount() {
    await act(async () => root.render(createElement(ApplyWizard, { resumeOptions: [] })));
}

describe('apply wizard mounted with React DOM', () => {
    it('walks all steps without a resume and keeps values when going back', async () => {
        await mount();
        await fill(0, 'Acme');
        await fill(1, 'Designer');
        await click('Continue');
        expect(container.textContent).toContain('You have no resumes yet.');
        await click('Continue');
        expect(container.textContent).toContain('Paste the job description');
        await click('Continue');
        expect(container.textContent).toContain('Track only');
        await click('Back');
        await click('Back');
        await click('Back');
        expect(container.querySelector('input')!.value).toBe('Acme');
    });

    it('keeps entered data and stays on the wizard when skipping fails', async () => {
        await mount();
        await fill(0, 'Acme');
        await click('Skip wizard');
        const options = vi.mocked(router.patch).mock.calls[0][2]!;
        await act(async () => {
            options.onError?.({ prefers_apply_wizard: 'Failed' });
            options.onFinish?.({} as never);
        });
        expect(router.get).not.toHaveBeenCalled();
        expect(container.querySelector('input')!.value).toBe('Acme');
        expect(container.textContent).toContain('Your entries are still here');
    });

    it('hands off explicit track-only selection only after a successful skip', async () => {
        await mount();
        await fill(0, 'Acme');
        await click('Skip wizard');
        const options = vi.mocked(router.patch).mock.calls[0][2]!;
        expect(router.get).not.toHaveBeenCalled();
        await act(async () => { options.onSuccess?.({} as never); });
        expect(router.get).toHaveBeenCalledWith('job-applications.index', expect.objectContaining({
            company: 'Acme', base_resume_id: '',
        }));
    });
});
