import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import TemplateSection from '../TemplateSection';
import type { ResumeDetail } from '../../../lib/resumeApi';

const baseResume = {
    id: 1, name: 'My CV', template: 'classic', pdf_filename: 'x.pdf', updated_at: '2026-07-01T00:00:00Z',
    accent_color: '#4f46e5', font_family: 'sans', summary: null,
    contact: null, experience: null, education: null, projects: null, skills: null, skills_layout: null,
    skills_groups: null, skill_narratives: null, certifications: null, font_sizes: null,
    section_order: null, custom_sections: null,
} as ResumeDetail;

describe('TemplateSection', () => {
    it('renders all 9 template options', async () => {
        await render(<TemplateSection resume={baseResume} onSave={jest.fn()} />);

        ['classic', 'modern', 'minimal', 'minimal-ruled', 'executive', 'ats', 'skills-first', 'academic', 'bold'].forEach((t) => {
            expect(screen.getByText(t)).toBeTruthy();
        });
    });

    it('calls onSave with the selected template when a different one is pressed', async () => {
        const onSave = jest.fn();
        await render(<TemplateSection resume={baseResume} onSave={onSave} />);

        await fireEvent.press(screen.getByText('modern'));

        expect(onSave).toHaveBeenCalledWith({ template: 'modern' });
    });

    it('calls onSave with the selected accent color', async () => {
        const onSave = jest.fn();
        await render(<TemplateSection resume={baseResume} onSave={onSave} />);

        await fireEvent.press(screen.getByTestId('accent-color-#166534'));

        expect(onSave).toHaveBeenCalledWith({ accent_color: '#166534' });
    });
});
