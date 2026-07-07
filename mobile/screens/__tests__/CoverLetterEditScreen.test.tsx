import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import CoverLetterEditScreen from '../CoverLetterEditScreen';
import * as coverLetterApi from '../../lib/coverLetterApi';
import * as resumeApi from '../../lib/resumeApi';

jest.mock('../../lib/coverLetterApi');
jest.mock('../../lib/resumeApi');

const letter = {
    id: 1, name: 'My Letter', template_key: 'standard', resume_id: null, updated_at: '2026-07-01T00:00:00Z', body: 'Dear Hiring Manager',
};

describe('CoverLetterEditScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (coverLetterApi.getCoverLetter as jest.Mock).mockResolvedValue(letter);
        (resumeApi.listResumes as jest.Mock).mockResolvedValue([]);
    });

    it('loads and renders the letter name, template, and body', async () => {
        await render(<CoverLetterEditScreen route={{ params: { letterId: 1 } }} />);

        await waitFor(() => expect(screen.getByDisplayValue('Dear Hiring Manager')).toBeTruthy());
        expect(screen.getByDisplayValue('My Letter')).toBeTruthy();
        expect(screen.getByText('standard')).toBeTruthy();
    });

    it('saves the name on blur', async () => {
        (coverLetterApi.updateCoverLetter as jest.Mock).mockResolvedValue({ ...letter, name: 'Renamed' });

        await render(<CoverLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('My Letter')).toBeTruthy());

        const nameInput = screen.getByDisplayValue('My Letter');
        await fireEvent.changeText(nameInput, 'Renamed');
        await fireEvent(nameInput, 'blur');

        await waitFor(() => expect(coverLetterApi.updateCoverLetter).toHaveBeenCalledWith(1, { name: 'Renamed' }));
    });

    it('saves the selected template_key when pressed', async () => {
        (coverLetterApi.updateCoverLetter as jest.Mock).mockResolvedValue({ ...letter, template_key: 'modern' });

        await render(<CoverLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByText('standard')).toBeTruthy());

        await fireEvent.press(screen.getByText('modern'));

        await waitFor(() => expect(coverLetterApi.updateCoverLetter).toHaveBeenCalledWith(1, { template_key: 'modern' }));
    });

    it('saves the body on blur', async () => {
        (coverLetterApi.updateCoverLetter as jest.Mock).mockResolvedValue({ ...letter, body: 'Updated body' });

        await render(<CoverLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('Dear Hiring Manager')).toBeTruthy());

        const bodyInput = screen.getByDisplayValue('Dear Hiring Manager');
        await fireEvent.changeText(bodyInput, 'Updated body');
        await fireEvent(bodyInput, 'blur');

        await waitFor(() => expect(coverLetterApi.updateCoverLetter).toHaveBeenCalledWith(1, { body: 'Updated body' }));
    });

    it('generates a letter and fills the body with the returned text', async () => {
        (coverLetterApi.generateCoverLetter as jest.Mock).mockResolvedValue({ body: 'Generated body text', remaining: 4 });

        await render(<CoverLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('Dear Hiring Manager')).toBeTruthy());

        await fireEvent.press(screen.getByText('Generate with AI'));

        await waitFor(() => expect(screen.getByDisplayValue('Generated body text')).toBeTruthy());
        expect(screen.getByText(/4 generations remaining/)).toBeTruthy();
    });

    it('shows an upgrade alert on a 402 response from generate', async () => {
        const { ApiError } = jest.requireActual('../../lib/api');
        (coverLetterApi.generateCoverLetter as jest.Mock).mockRejectedValue(new ApiError(402, 'Monthly AI limit reached.'));

        await render(<CoverLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('Dear Hiring Manager')).toBeTruthy());

        await fireEvent.press(screen.getByText('Generate with AI'));

        await waitFor(() => expect(coverLetterApi.generateCoverLetter).toHaveBeenCalled());
    });

    it('shows an inline message on a 422 moderation response from generate', async () => {
        const { ApiError } = jest.requireActual('../../lib/api');
        (coverLetterApi.generateCoverLetter as jest.Mock).mockRejectedValue(new ApiError(422, "This content can't be processed."));

        await render(<CoverLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('Dear Hiring Manager')).toBeTruthy());

        await fireEvent.press(screen.getByText('Generate with AI'));

        await waitFor(() => expect(screen.getByText("Couldn't generate — try adjusting your input.")).toBeTruthy());
    });
});
