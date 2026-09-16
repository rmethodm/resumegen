/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { toastSuccess, toastError } = vi.hoisted(() => ({
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }));

const { routerOn } = vi.hoisted(() => ({ routerOn: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { flash: { success: 'Saved', error: null } } }),
    router: { on: routerOn },
}));

import { useFlashToasts } from '@/hooks/use-flash-toasts';

describe('useFlashToasts', () => {
    beforeEach(() => {
        toastSuccess.mockClear();
        toastError.mockClear();
        routerOn.mockReset();
        routerOn.mockReturnValue(() => {});
    });

    it('fires a success toast when flash.success is set', () => {
        renderHook(() => useFlashToasts());
        expect(toastSuccess).toHaveBeenCalledWith('Saved');
        expect(toastError).not.toHaveBeenCalled();
    });

    it('fires a toast again for a repeated, identical flash message on a later navigation', () => {
        // Regression: depending only on the flash *value* would not re-fire for
        // two consecutive identical messages (e.g. "Checkpoint saved." twice),
        // since the string wouldn't have "changed" between renders. The hook
        // must react to each completed Inertia visit instead.
        renderHook(() => useFlashToasts());
        expect(routerOn).toHaveBeenCalledWith('success', expect.any(Function));

        const successHandler = routerOn.mock.calls[0][1];
        toastSuccess.mockClear();

        successHandler({ detail: { page: { props: { flash: { success: 'Saved', error: null } } } } });
        expect(toastSuccess).toHaveBeenCalledTimes(1);

        successHandler({ detail: { page: { props: { flash: { success: 'Saved', error: null } } } } });
        expect(toastSuccess).toHaveBeenCalledTimes(2);
    });
});
