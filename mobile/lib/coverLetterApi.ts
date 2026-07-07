import { apiFetch } from './api';

export type CoverLetterTemplateKey = 'standard' | 'modern' | 'career_change' | 'new_grad' | 'referral';

export type CoverLetterSummary = {
    id: number;
    name: string;
    template_key: CoverLetterTemplateKey;
    resume_id: number | null;
    updated_at: string;
};

export type CoverLetterDetail = CoverLetterSummary & {
    body: string;
};

export async function listCoverLetters(): Promise<CoverLetterSummary[]> {
    const { data } = await apiFetch<{ data: CoverLetterSummary[] }>('/api/cover-letters');

    return data;
}

export async function getCoverLetter(id: number): Promise<CoverLetterDetail> {
    return apiFetch<CoverLetterDetail>(`/api/cover-letters/${id}`);
}

export async function updateCoverLetter(
    id: number,
    data: Partial<{ name: string; template_key: CoverLetterTemplateKey; body: string; resume_id: number | null }>,
): Promise<CoverLetterDetail> {
    return apiFetch<CoverLetterDetail>(`/api/cover-letters/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function generateCoverLetter(
    id: number,
    input: { tone: 'formal' | 'warm' | 'brief'; job_description?: string },
): Promise<{ body: string; remaining: number }> {
    return apiFetch<{ body: string; remaining: number }>(`/api/cover-letters/${id}/generate`, {
        method: 'POST',
        body: JSON.stringify(input),
    });
}
