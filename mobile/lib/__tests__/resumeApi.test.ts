import { listResumes, getResume } from '../resumeApi';
import * as api from '../api';

jest.mock('../api');

beforeEach(() => {
    jest.clearAllMocks();
});

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

import { updateResume, uploadResumePhoto, deleteResumePhoto } from '../resumeApi';

describe('updateResume', () => {
    it('PUTs the partial fields and returns the updated resume', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({ id: 1, name: 'Renamed' });

        const result = await updateResume(1, { name: 'Renamed' });

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resumes/1', {
            method: 'PUT',
            body: JSON.stringify({ name: 'Renamed' }),
        });
        expect(result.name).toBe('Renamed');
    });
});

describe('uploadResumePhoto', () => {
    it('POSTs a FormData body with the photo field', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({ photo_url: 'https://example.test/photo.jpg' });

        const result = await uploadResumePhoto(1, 'file:///tmp/photo.jpg');

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resumes/1/photo', expect.objectContaining({ method: 'POST' }));
        const callArgs = (api.apiFetch as jest.Mock).mock.calls[0][1];
        expect(callArgs.body).toBeInstanceOf(FormData);
        expect(result.photo_url).toBe('https://example.test/photo.jpg');
    });
});

describe('deleteResumePhoto', () => {
    it('DELETEs the photo endpoint', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({ photo_url: null });

        const result = await deleteResumePhoto(1);

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resumes/1/photo', { method: 'DELETE' });
        expect(result.photo_url).toBeNull();
    });
});
