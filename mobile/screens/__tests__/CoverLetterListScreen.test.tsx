import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import CoverLetterListScreen from '../CoverLetterListScreen';
import * as coverLetterApi from '../../lib/coverLetterApi';

jest.mock('../../lib/coverLetterApi');

describe('CoverLetterListScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders cover letters returned by the API', async () => {
        (coverLetterApi.listCoverLetters as jest.Mock).mockResolvedValue([
            { id: 1, name: 'My Letter', template_key: 'standard', resume_id: null, updated_at: '2026-07-01T00:00:00Z' },
        ]);

        await render(<CoverLetterListScreen navigation={{ navigate: jest.fn() }} />);

        await waitFor(() => expect(screen.getByText('My Letter')).toBeTruthy());
    });

    it('shows a retry option when loading fails', async () => {
        (coverLetterApi.listCoverLetters as jest.Mock).mockRejectedValue(new Error('network'));

        await render(<CoverLetterListScreen navigation={{ navigate: jest.fn() }} />);

        await waitFor(() => expect(screen.getByText("Couldn't load your cover letters.")).toBeTruthy());
    });
});
