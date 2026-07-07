import { listResumes, getResume } from '../resumeApi';
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

describe('getResume', () => {
    it('fetches a single resume by id', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({
            id: 1,
            name: 'My CV',
            template: 'classic',
            pdf_filename: 'x.pdf',
            updated_at: '2026-07-01T00:00:00Z',
            contact: { email: 'a@b.com' },
            summary: 'Experienced engineer.',
            experience: [{}],
            education: [],
            skills: ['PHP'],
        });

        const resume = await getResume(1);

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resumes/1');
        expect(resume.summary).toBe('Experienced engineer.');
    });
});
