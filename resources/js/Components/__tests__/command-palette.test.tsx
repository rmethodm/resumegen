/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CommandPalette } from '@/Components/command-palette';

vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn() },
}));

describe('CommandPalette', () => {
    it('opens on Cmd+K and navigates on item select', async () => {
        render(<CommandPalette items={[{ label: 'Dashboard', href: '/dashboard' }]} />);

        fireEvent.keyDown(window, { key: 'k', metaKey: true });
        expect(await screen.findByPlaceholderText(/type a command/i)).toBeVisible();

        fireEvent.click(screen.getByText('Dashboard'));

        const { router } = await import('@inertiajs/react');
        expect(router.visit).toHaveBeenCalledWith('/dashboard');
    });

    it('filters items as the user types', async () => {
        render(
            <CommandPalette
                items={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Shares', href: '/shares' },
                ]}
            />,
        );

        fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
        const input = await screen.findByPlaceholderText(/type a command/i);

        fireEvent.change(input, { target: { value: 'share' } });

        expect(screen.getByText('Shares')).toBeVisible();
        expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });
});
