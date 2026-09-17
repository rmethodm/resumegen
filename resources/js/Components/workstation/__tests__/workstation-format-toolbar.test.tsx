/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkstationFormatToolbar } from '../workstation-format-toolbar';

function baseProps() {
    return {
        canUndo: false,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        template: 'classic' as const,
        onTemplateClick: vi.fn(),
        font: 'inter' as const,
        onFontChange: vi.fn(),
        density: 'balanced' as const,
        onDensityChange: vi.fn(),
        bulletStyle: 'bullet' as const,
        onBulletStyleChange: vi.fn(),
        skillsLayout: 'inline' as const,
        onSkillsLayoutChange: vi.fn(),
        pageEstimateDraft: {
            summary: '',
            experiences: [],
            projects: [],
            education: [],
            certificates: [],
            skills: [],
            density: 'balanced' as const,
        },
        zoom: 1 as const,
        onZoomChange: vi.fn(),
        reviewActive: true,
        activeTab: 'Edit' as const,
        onTabChange: vi.fn(),
        layoutMode: 'tabs' as const,
        onLayoutModeChange: vi.fn(),
    };
}

describe('WorkstationFormatToolbar layout switcher', () => {
    it('shows the Tabs/Edit switcher when layoutMode is tabs', () => {
        render(<WorkstationFormatToolbar {...baseProps()} />);
        expect(screen.getByRole('tablist', { name: 'Workstation mode' })).toBeInTheDocument();
    });

    it('hides the tab switcher and shows document tools for non-tabs modes', () => {
        render(<WorkstationFormatToolbar {...baseProps()} layoutMode="inline" />);
        expect(screen.queryByRole('tablist', { name: 'Workstation mode' })).not.toBeInTheDocument();
        expect(screen.getByLabelText('Template')).toBeInTheDocument();
    });

    it('changing the Layout select calls onLayoutModeChange', () => {
        const onLayoutModeChange = vi.fn();
        render(<WorkstationFormatToolbar {...baseProps()} onLayoutModeChange={onLayoutModeChange} />);
        fireEvent.change(screen.getByLabelText('Workstation layout'), { target: { value: 'hybrid' } });
        expect(onLayoutModeChange).toHaveBeenCalledWith('hybrid');
    });

    it('shows an Optimize button in overlay mode when onOpenOptimize is passed', () => {
        const onOpenOptimize = vi.fn();
        render(
            <WorkstationFormatToolbar
                {...baseProps()}
                layoutMode="overlay"
                onOpenOptimize={onOpenOptimize}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Optimize' }));
        expect(onOpenOptimize).toHaveBeenCalled();
    });
});
