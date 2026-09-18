/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApplicationAppearanceToolbar } from './application-appearance-toolbar';

describe('application appearance toolbar', () => {
    it('preserves formatting and preview callbacks without changing the document implicitly', () => {
        const onFontChange = vi.fn(); const onDensityChange = vi.fn(); const onZoomChange = vi.fn(); const onTemplateClick = vi.fn();
        render(<ApplicationAppearanceToolbar canUndo={false} canRedo={false} onUndo={vi.fn()} onRedo={vi.fn()} template="classic" onTemplateClick={onTemplateClick} font="inter" onFontChange={onFontChange} density="balanced" onDensityChange={onDensityChange} bulletStyle="bullet" onBulletStyleChange={vi.fn()} skillsLayout="inline" onSkillsLayoutChange={vi.fn()} pageEstimateDraft={{ summary: '', experiences: [], projects: [], education: [], certificates: [], skills: [], density: 'balanced' }} zoom={1} onZoomChange={onZoomChange} />);
        expect(onFontChange).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Template' }));
        expect(onTemplateClick).toHaveBeenCalledOnce();
        fireEvent.change(screen.getByRole('combobox', { name: 'Preview zoom' }), { target: { value: '1.25' } });
        expect(onZoomChange).toHaveBeenCalledWith(1.25);
        fireEvent.click(screen.getByRole('button', { name: 'Text format' }));
        fireEvent.change(screen.getByLabelText('Font'), { target: { value: 'georgia' } });
        fireEvent.change(screen.getByLabelText('Spacing'), { target: { value: 'compact' } });
        expect(onFontChange).toHaveBeenCalledWith('georgia');
        expect(onDensityChange).toHaveBeenCalledWith('compact');
    });
});
