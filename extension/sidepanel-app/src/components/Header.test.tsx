import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

describe('Header', () => {
    it('opens the menu and calls onDisconnect when Disconnect is clicked', () => {
        const onDisconnect = vi.fn();
        window.confirm = vi.fn(() => true);

        render(
            <Header
                onRefresh={vi.fn()}
                onOpenApp={vi.fn()}
                onOpenSettings={vi.fn()}
                onDisconnect={onDisconnect}
            />,
        );

        fireEvent.click(screen.getByTitle('Menu'));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Disconnect' }));

        expect(onDisconnect).toHaveBeenCalledTimes(1);
    });
});
