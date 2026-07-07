import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ResumeEditScreen from '../ResumeEditScreen';
import * as resumeApi from '../../lib/resumeApi';

jest.mock('../../lib/resumeApi');

// Avoid pulling in react-native-draggable-flatlist (and its Reanimated/
// gesture-handler dependencies) into this screen's test. The real component
// is covered by its own test in screens/resume-edit/__tests__/SectionOrderSection.test.tsx.
jest.mock('../resume-edit/SectionOrderSection', () => {
    const { View, Text } = require('react-native');
    return function MockSectionOrderSection() {
        return (
            <View>
                <Text>Section order (mocked)</Text>
            </View>
        );
    };
});

const fullResume = {
    id: 1, name: 'My CV', template: 'classic', pdf_filename: 'x.pdf', updated_at: '2026-07-01T00:00:00Z',
    accent_color: null, font_family: null, summary: 'A summary',
    contact: { full_name: 'Jane', email: 'jane@example.com', phone: '', location: '', linkedin: '', website: '' },
    experience: [], education: [], projects: [], skills: [], skills_layout: null,
    skills_groups: [], skill_narratives: [], certifications: [], font_sizes: null,
    section_order: ['summary', 'experience'], custom_sections: [],
};

describe('ResumeEditScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (resumeApi.getResume as jest.Mock).mockResolvedValue(fullResume);
    });

    it('loads and renders the resume', async () => {
        await render(<ResumeEditScreen route={{ params: { resumeId: 1 } }} />);

        await waitFor(() => expect(screen.getByDisplayValue('My CV')).toBeTruthy());
        expect(resumeApi.getResume).toHaveBeenCalledWith(1);
    });

    it('saves a Basics field change via updateResume and merges the response', async () => {
        (resumeApi.updateResume as jest.Mock).mockResolvedValue({ ...fullResume, name: 'Renamed CV' });

        await render(<ResumeEditScreen route={{ params: { resumeId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('My CV')).toBeTruthy());

        const nameInput = screen.getByDisplayValue('My CV');
        await fireEvent.changeText(nameInput, 'Renamed CV');
        await fireEvent(nameInput, 'blur');

        await waitFor(() => expect(resumeApi.updateResume).toHaveBeenCalledWith(1, { name: 'Renamed CV' }));
        await waitFor(() => expect(screen.getByDisplayValue('Renamed CV')).toBeTruthy());
    });

    it('shows a retry option when loading fails', async () => {
        (resumeApi.getResume as jest.Mock).mockRejectedValue(new Error('network'));

        await render(<ResumeEditScreen route={{ params: { resumeId: 1 } }} />);

        await waitFor(() => expect(screen.getByText("Couldn't load this resume.")).toBeTruthy());
    });
});
