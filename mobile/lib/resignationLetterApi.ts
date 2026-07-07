import { apiFetch } from './api';

export type ResignationLetterTemplateKey = 'standard' | 'immediate' | 'warm';

export type ResignationLetterSummary = {
    id: number;
    name: string;
    template_key: ResignationLetterTemplateKey;
    resume_id: number | null;
    updated_at: string;
};

export type ResignationLetterDetail = ResignationLetterSummary & {
    body: string;
};

export async function listResignationLetters(): Promise<ResignationLetterSummary[]> {
    const { data } = await apiFetch<{ data: ResignationLetterSummary[] }>('/api/resignation-letters');

    return data;
}

export async function getResignationLetter(id: number): Promise<ResignationLetterDetail> {
    return apiFetch<ResignationLetterDetail>(`/api/resignation-letters/${id}`);
}

export async function updateResignationLetter(
    id: number,
    data: Partial<{ name: string; template_key: ResignationLetterTemplateKey; body: string; resume_id: number | null }>,
): Promise<ResignationLetterDetail> {
    return apiFetch<ResignationLetterDetail>(`/api/resignation-letters/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function generateResignationLetter(
    id: number,
    input: { tone: 'formal' | 'warm' | 'brief'; last_day: string; reason?: string },
): Promise<{ body: string; remaining: number }> {
    return apiFetch<{ body: string; remaining: number }>(`/api/resignation-letters/${id}/generate`, {
        method: 'POST',
        body: JSON.stringify(input),
    });
}
