import {
    listResignationLetters,
    getResignationLetter,
    updateResignationLetter,
    generateResignationLetter,
} from '../resignationLetterApi';
import * as api from '../api';

jest.mock('../api');

describe('listResignationLetters', () => {
    it('returns the resignation letter array from the API', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({
            data: [{ id: 1, name: 'My Letter', template_key: 'standard', resume_id: null, updated_at: '2026-07-01T00:00:00Z' }],
        });

        const letters = await listResignationLetters();

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resignation-letters');
        expect(letters).toHaveLength(1);
    });
});

describe('getResignationLetter', () => {
    it('fetches a single resignation letter by id', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({
            id: 1, name: 'My Letter', template_key: 'standard', resume_id: null, updated_at: '2026-07-01T00:00:00Z', body: 'Dear Manager',
        });

        const letter = await getResignationLetter(1);

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resignation-letters/1');
        expect(letter.body).toBe('Dear Manager');
    });
});

describe('updateResignationLetter', () => {
    it('PUTs the partial fields', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({ id: 1, name: 'Renamed' });

        await updateResignationLetter(1, { name: 'Renamed' });

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resignation-letters/1', {
            method: 'PUT',
            body: JSON.stringify({ name: 'Renamed' }),
        });
    });
});

describe('generateResignationLetter', () => {
    it('POSTs tone/last_day/reason and returns body/remaining', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({ body: 'Generated body', remaining: 3 });

        const result = await generateResignationLetter(1, { tone: 'warm', last_day: '2026-08-01', reason: 'New opportunity' });

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resignation-letters/1/generate', {
            method: 'POST',
            body: JSON.stringify({ tone: 'warm', last_day: '2026-08-01', reason: 'New opportunity' }),
        });
        expect(result.remaining).toBe(3);
    });
});
