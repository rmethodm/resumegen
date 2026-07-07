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

export type ResumeDetail = ResumeSummary & {
    contact: Record<string, string> | null;
    summary: string | null;
    experience: unknown[] | null;
    education: unknown[] | null;
    skills: unknown[] | null;
};

export async function getResume(id: number): Promise<ResumeDetail> {
    return apiFetch<ResumeDetail>(`/api/resumes/${id}`);
}
