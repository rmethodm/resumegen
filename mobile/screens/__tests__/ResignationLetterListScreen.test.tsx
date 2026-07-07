import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import ResignationLetterListScreen from '../ResignationLetterListScreen';
import * as resignationLetterApi from '../../lib/resignationLetterApi';

jest.mock('../../lib/resignationLetterApi');

describe('ResignationLetterListScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders resignation letters returned by the API', async () => {
        (resignationLetterApi.listResignationLetters as jest.Mock).mockResolvedValue([
            { id: 1, name: 'My Letter', template_key: 'standard', resume_id: null, updated_at: '2026-07-01T00:00:00Z' },
        ]);

        await render(<ResignationLetterListScreen navigation={{ navigate: jest.fn() }} />);

        await waitFor(() => expect(screen.getByText('My Letter')).toBeTruthy());
    });

    it('shows a retry option when loading fails', async () => {
        (resignationLetterApi.listResignationLetters as jest.Mock).mockRejectedValue(new Error('network'));

        await render(<ResignationLetterListScreen navigation={{ navigate: jest.fn() }} />);

        await waitFor(() => expect(screen.getByText("Couldn't load your resignation letters.")).toBeTruthy());
    });
});
