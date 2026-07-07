import { listCoverLetters, getCoverLetter, updateCoverLetter, generateCoverLetter } from '../coverLetterApi';
import * as api from '../api';

jest.mock('../api');

describe('listCoverLetters', () => {
    it('returns the cover letter array from the API', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({
            data: [{ id: 1, name: 'My Letter', template_key: 'standard', resume_id: null, updated_at: '2026-07-01T00:00:00Z' }],
        });

        const letters = await listCoverLetters();

        expect(api.apiFetch).toHaveBeenCalledWith('/api/cover-letters');
        expect(letters).toHaveLength(1);
    });
});

describe('getCoverLetter', () => {
    it('fetches a single cover letter by id', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({
            id: 1, name: 'My Letter', template_key: 'standard', resume_id: null, updated_at: '2026-07-01T00:00:00Z', body: 'Dear Hiring Manager',
        });

        const letter = await getCoverLetter(1);

        expect(api.apiFetch).toHaveBeenCalledWith('/api/cover-letters/1');
        expect(letter.body).toBe('Dear Hiring Manager');
    });
});

describe('updateCoverLetter', () => {
    it('PUTs the partial fields', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({ id: 1, name: 'Renamed' });

        await updateCoverLetter(1, { name: 'Renamed' });

        expect(api.apiFetch).toHaveBeenCalledWith('/api/cover-letters/1', {
            method: 'PUT',
            body: JSON.stringify({ name: 'Renamed' }),
        });
    });
});

describe('generateCoverLetter', () => {
    it('POSTs tone and job_description and returns body/remaining', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({ body: 'Generated body', remaining: 4 });

        const result = await generateCoverLetter(1, { tone: 'formal', job_description: 'A job.' });

        expect(api.apiFetch).toHaveBeenCalledWith('/api/cover-letters/1/generate', {
            method: 'POST',
            body: JSON.stringify({ tone: 'formal', job_description: 'A job.' }),
        });
        expect(result.remaining).toBe(4);
    });
});
