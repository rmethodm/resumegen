import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('App', () => {
    it('shows the setup view when there is no token', async () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true, token: '', appBase: 'https://resumegen.test' });

        render(<App />);

        await waitFor(() => expect(screen.getByText('Connect your Resumegen account')).toBeInTheDocument());
    });

    it('loads resumes and shows the empty view when connected with no resumes', async () => {
        vi.mocked(chrome.runtime.sendMessage)
            .mockResolvedValueOnce({ ok: true, token: 'abc', appBase: 'https://resumegen.test' })
            .mockResolvedValueOnce({ ok: true, data: { groups: [], user: null } });

        render(<App />);

        await waitFor(() => expect(screen.getByText('No resumes yet')).toBeInTheDocument());
    });
});
