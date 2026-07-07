import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import ResumeListScreen from '../ResumeListScreen';
import * as resumeApi from '../../lib/resumeApi';

jest.mock('../../lib/resumeApi');
jest.mock('../../navigation/AuthContext', () => ({
    ...jest.requireActual('../../navigation/AuthContext'),
    useAuth: () => ({ logout: jest.fn() }),
}));

describe('ResumeListScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders resumes returned by the API', async () => {
        (resumeApi.listResumes as jest.Mock).mockResolvedValue([
            { id: 1, name: 'My CV', template: 'classic', pdf_filename: 'x.pdf', updated_at: '2026-07-01T00:00:00Z' },
        ]);

        render(<ResumeListScreen navigation={{ navigate: jest.fn() }} />);

        await waitFor(() => expect(screen.getByText('My CV')).toBeTruthy());
    });

    it('shows a retry option when loading fails', async () => {
        (resumeApi.listResumes as jest.Mock).mockRejectedValue(new Error('network'));

        render(<ResumeListScreen navigation={{ navigate: jest.fn() }} />);

        await waitFor(() => expect(screen.getByText("Couldn't load your resumes.")).toBeTruthy());
    });

    it('navigates to CoverLetters when the Cover Letters button is pressed', async () => {
        (resumeApi.listResumes as jest.Mock).mockResolvedValue([]);
        const navigation = { navigate: jest.fn() };

        render(<ResumeListScreen navigation={navigation} />);
        await waitFor(() => expect(screen.getByText('No resumes yet.')).toBeTruthy());

        await fireEvent.press(screen.getByText('Cover Letters'));

        expect(navigation.navigate).toHaveBeenCalledWith('CoverLetters');
    });

    it('navigates to ResignationLetters when the Resignation Letters button is pressed', async () => {
        (resumeApi.listResumes as jest.Mock).mockResolvedValue([]);
        const navigation = { navigate: jest.fn() };

        render(<ResumeListScreen navigation={navigation} />);
        await waitFor(() => expect(screen.getByText('No resumes yet.')).toBeTruthy());

        await fireEvent.press(screen.getByText('Resignation Letters'));

        expect(navigation.navigate).toHaveBeenCalledWith('ResignationLetters');
    });
});
