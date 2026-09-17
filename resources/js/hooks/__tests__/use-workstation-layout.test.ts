/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { routerPatch } = vi.hoisted(() => ({ routerPatch: vi.fn() }));

vi.stubGlobal('route', (name: string) => `${name}-url`);

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { auth: { user: { workstation_layout: 'tabs' } } } }),
    router: { patch: routerPatch },
}));

import { useWorkstationLayout } from '@/hooks/use-workstation-layout';

describe('useWorkstationLayout', () => {
    beforeEach(() => {
        routerPatch.mockReset();
    });

    it('reads the initial mode from the page props', () => {
        const { result } = renderHook(() => useWorkstationLayout());
        expect(result.current[0]).toBe('tabs');
    });

    it('updates local state immediately and persists in the background', () => {
        const { result } = renderHook(() => useWorkstationLayout());

        act(() => {
            result.current[1]('hybrid');
        });

        expect(result.current[0]).toBe('hybrid');
        expect(routerPatch).toHaveBeenCalledWith(
            'workstation-layout.update-url',
            { workstation_layout: 'hybrid' },
            expect.objectContaining({ preserveScroll: true, preserveState: true }),
        );
    });
});
