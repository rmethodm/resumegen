import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useConnection } from './useConnection';

describe('useConnection', () => {
    it('reports connected when GET_CONFIG returns a token', async () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true, token: 'abc', appBase: 'https://resumegen.test' });

        const { result } = renderHook(() => useConnection());

        await waitFor(() => expect(result.current.status).toBe('connected'));
    });

    it('reports disconnected when GET_CONFIG returns no token', async () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true, token: '', appBase: 'https://resumegen.test' });

        const { result } = renderHook(() => useConnection());

        await waitFor(() => expect(result.current.status).toBe('disconnected'));
    });
});
