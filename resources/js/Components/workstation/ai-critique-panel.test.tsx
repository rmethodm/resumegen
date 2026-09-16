/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiCritiquePanel } from './ai-critique-panel';

const baseProps = {
    resumeId: 1,
    jd: '',
    initialSuggestions: null,
    initialGeneratedAt: null,
    initialPreset: null,
    onJump: vi.fn(),
};

describe('AiCritiquePanel', () => {
    beforeEach(() => {
        document.head.innerHTML = '<meta name="csrf-token" content="test-token">';
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('shows a locked state when not subscribed', () => {
        render(
            <AiCritiquePanel
                {...baseProps}
                credits={{ balance: 0, subscribed: false, canPurchase: false }}
            />,
        );
        expect(screen.getByText(/subscribe/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /run critique/i })).not.toBeInTheDocument();
    });

    it('shows the run button when subscribed with credits', () => {
        render(
            <AiCritiquePanel
                {...baseProps}
                credits={{ balance: 3, subscribed: true, canPurchase: true }}
            />,
        );
        expect(screen.getByRole('button', { name: /run critique/i })).toBeInTheDocument();
    });

    it('runs a critique and renders results grouped by severity', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                suggestions: [
                    { id: 'a', label: 'High issue', severity: 'high', section: 'summary', detail: 'x' },
                    { id: 'b', label: 'Low issue', severity: 'low', section: 'skills', detail: 'y' },
                ],
                generated_at: '2026-09-16T00:00:00Z',
                preset: 'general',
                credits_remaining: 2,
            }),
        }) as unknown as typeof fetch;

        render(
            <AiCritiquePanel
                {...baseProps}
                credits={{ balance: 3, subscribed: true, canPurchase: true }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /run critique/i }));

        await waitFor(() => {
            expect(screen.getByText('High issue')).toBeInTheDocument();
        });
        expect(screen.getByText('Low issue')).toBeInTheDocument();
    });

    it('disables the Tailor to JD preset when no JD is pasted', () => {
        render(
            <AiCritiquePanel
                {...baseProps}
                jd=""
                credits={{ balance: 3, subscribed: true, canPurchase: true }}
            />,
        );
        const select = screen.getByLabelText(/preset/i);
        const tailorOption = Array.from(select.querySelectorAll('option')).find(
            (opt) => opt.textContent?.includes('Tailor to this JD'),
        );
        expect(tailorOption).toBeDisabled();
    });
});
