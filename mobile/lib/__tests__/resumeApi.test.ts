import { listResumes } from '../resumeApi';
import * as api from '../api';

jest.mock('../api');

describe('listResumes', () => {
    it('returns the resume array from the API', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({
            data: [{ id: 1, name: 'My CV', template: 'classic', pdf_filename: 'x.pdf', updated_at: '2026-07-01T00:00:00Z' }],
        });

        const resumes = await listResumes();

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resumes');
        expect(resumes).toHaveLength(1);
        expect(resumes[0].name).toBe('My CV');
    });
});
