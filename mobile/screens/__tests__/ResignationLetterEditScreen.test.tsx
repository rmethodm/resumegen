import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ResignationLetterEditScreen from '../ResignationLetterEditScreen';
import * as resignationLetterApi from '../../lib/resignationLetterApi';
import * as resumeApi from '../../lib/resumeApi';

jest.mock('../../lib/resignationLetterApi');
jest.mock('../../lib/resumeApi');

const letter = {
    id: 1, name: 'My Letter', template_key: 'standard', resume_id: null, updated_at: '2026-07-01T00:00:00Z', body: 'Dear Manager',
};

describe('ResignationLetterEditScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (resignationLetterApi.getResignationLetter as jest.Mock).mockResolvedValue(letter);
        (resumeApi.listResumes as jest.Mock).mockResolvedValue([]);
    });

    it('loads and renders the letter name, template, and body', async () => {
        await render(<ResignationLetterEditScreen route={{ params: { letterId: 1 } }} />);

        await waitFor(() => expect(screen.getByDisplayValue('Dear Manager')).toBeTruthy());
        expect(screen.getByDisplayValue('My Letter')).toBeTruthy();
        expect(screen.getByText('standard')).toBeTruthy();
    });

    it('saves the name on blur', async () => {
        (resignationLetterApi.updateResignationLetter as jest.Mock).mockResolvedValue({ ...letter, name: 'Renamed' });

        await render(<ResignationLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('My Letter')).toBeTruthy());

        const nameInput = screen.getByDisplayValue('My Letter');
        await fireEvent.changeText(nameInput, 'Renamed');
        await fireEvent(nameInput, 'blur');

        await waitFor(() => expect(resignationLetterApi.updateResignationLetter).toHaveBeenCalledWith(1, { name: 'Renamed' }));
    });

    it('saves the selected template_key when pressed', async () => {
        // 'warm' is both a template_key and a tone value here, so this asserts via testID
        // (`template-warm`) rather than getByText, which would match both chips.
        (resignationLetterApi.updateResignationLetter as jest.Mock).mockResolvedValue({ ...letter, template_key: 'warm' });

        await render(<ResignationLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByText('standard')).toBeTruthy());

        await fireEvent.press(screen.getByTestId('template-warm'));

        await waitFor(() => expect(resignationLetterApi.updateResignationLetter).toHaveBeenCalledWith(1, { template_key: 'warm' }));
    });

    it('saves the body on blur', async () => {
        (resignationLetterApi.updateResignationLetter as jest.Mock).mockResolvedValue({ ...letter, body: 'Updated body' });

        await render(<ResignationLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('Dear Manager')).toBeTruthy());

        const bodyInput = screen.getByDisplayValue('Dear Manager');
        await fireEvent.changeText(bodyInput, 'Updated body');
        await fireEvent(bodyInput, 'blur');

        await waitFor(() => expect(resignationLetterApi.updateResignationLetter).toHaveBeenCalledWith(1, { body: 'Updated body' }));
    });

    it('generates a letter with tone/last_day/reason and fills the body', async () => {
        (resignationLetterApi.generateResignationLetter as jest.Mock).mockResolvedValue({ body: 'Generated body text', remaining: 2 });

        await render(<ResignationLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('Dear Manager')).toBeTruthy());

        await fireEvent.changeText(screen.getByPlaceholderText('Last day (YYYY-MM-DD)'), '2026-08-01');
        await fireEvent.press(screen.getByText('Generate with AI'));

        await waitFor(() => expect(resignationLetterApi.generateResignationLetter).toHaveBeenCalledWith(1, {
            tone: 'formal',
            last_day: '2026-08-01',
            reason: undefined,
        }));
        await waitFor(() => expect(screen.getByDisplayValue('Generated body text')).toBeTruthy());
    });

    it('shows an inline message on a 422 moderation response from generate', async () => {
        const { ApiError } = jest.requireActual('../../lib/api');
        (resignationLetterApi.generateResignationLetter as jest.Mock).mockRejectedValue(new ApiError(422, "This content can't be processed."));

        await render(<ResignationLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('Dear Manager')).toBeTruthy());

        await fireEvent.press(screen.getByText('Generate with AI'));

        await waitFor(() => expect(screen.getByText("Couldn't generate — try adjusting your input.")).toBeTruthy());
    });
});
