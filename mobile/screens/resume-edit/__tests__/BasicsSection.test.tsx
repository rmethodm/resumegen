import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import BasicsSection from '../BasicsSection';
import type { ResumeDetail } from '../../../lib/resumeApi';

const baseResume = {
    id: 1, name: 'My CV', template: 'classic', pdf_filename: 'x.pdf', updated_at: '2026-07-01T00:00:00Z',
    accent_color: null, font_family: null, summary: 'A summary',
    contact: { full_name: 'Jane Doe', email: 'jane@example.com', phone: '', location: '', linkedin: '', website: '' },
    experience: null, education: null, projects: null, skills: null, skills_layout: null,
    skills_groups: null, skill_narratives: null, certifications: null, font_sizes: null,
    section_order: null, custom_sections: null,
} as ResumeDetail;

describe('BasicsSection', () => {
    it('renders name, contact, and summary fields with current values', async () => {
        await render(<BasicsSection resume={baseResume} onSave={jest.fn()} />);

        expect(screen.getByDisplayValue('My CV')).toBeTruthy();
        expect(screen.getByDisplayValue('jane@example.com')).toBeTruthy();
        expect(screen.getByDisplayValue('A summary')).toBeTruthy();
    });

    it('calls onSave with the changed field on blur', async () => {
        const onSave = jest.fn();
        await render(<BasicsSection resume={baseResume} onSave={onSave} />);

        const nameInput = screen.getByDisplayValue('My CV');
        await fireEvent.changeText(nameInput, 'Renamed CV');
        await fireEvent(nameInput, 'blur');

        expect(onSave).toHaveBeenCalledWith({ name: 'Renamed CV' });
    });

    it('calls onSave with the whole contact object when a contact field blurs', async () => {
        const onSave = jest.fn();
        await render(<BasicsSection resume={baseResume} onSave={onSave} />);

        const emailInput = screen.getByDisplayValue('jane@example.com');
        await fireEvent.changeText(emailInput, 'jane.doe@example.com');
        await fireEvent(emailInput, 'blur');

        expect(onSave).toHaveBeenCalledWith({
            contact: { ...baseResume.contact, email: 'jane.doe@example.com' },
        });
    });
});
