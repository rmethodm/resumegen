import { apiFetch } from './api';

export type ResumeSummary = {
    id: number;
    name: string;
    template: string;
    pdf_filename: string;
    updated_at: string;
};

export async function listResumes(): Promise<ResumeSummary[]> {
    const { data } = await apiFetch<{ data: ResumeSummary[] }>('/api/resumes');

    return data;
}
