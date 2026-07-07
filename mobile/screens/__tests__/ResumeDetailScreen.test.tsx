import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import ResumeDetailScreen from '../ResumeDetailScreen';
import * as resumeApi from '../../lib/resumeApi';

jest.mock('../../lib/resumeApi');
jest.mock('expo-file-system', () => ({ cacheDirectory: '/tmp/', downloadAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn().mockResolvedValue(false) }));

describe('ResumeDetailScreen', () => {
    it('renders the resume summary and section counts', async () => {
        (resumeApi.getResume as jest.Mock).mockResolvedValue({
            id: 1,
            name: 'My CV',
            template: 'classic',
            pdf_filename: 'x.pdf',
            updated_at: '2026-07-01T00:00:00Z',
            contact: { email: 'a@b.com' },
            summary: 'Experienced engineer.',
            experience: [{}, {}],
            education: [{}],
            skills: ['PHP', 'TypeScript'],
        });

        render(<ResumeDetailScreen route={{ params: { resumeId: 1 } }} />);

        await waitFor(() => expect(screen.getByText('My CV')).toBeTruthy());
        expect(screen.getByText('2 work experience entries')).toBeTruthy();
        expect(screen.getByText('2 skills listed')).toBeTruthy();
    });

    it('shows a retry option when loading fails', async () => {
        (resumeApi.getResume as jest.Mock).mockRejectedValue(new Error('network'));

        render(<ResumeDetailScreen route={{ params: { resumeId: 1 } }} />);

        await waitFor(() => expect(screen.getByText("Couldn't load this resume.")).toBeTruthy());
    });
});
