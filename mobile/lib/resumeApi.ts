import { apiFetch } from './api';

export type Contact = {
    full_name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    website: string;
};

export type ExperienceEntry = {
    id: string;
    company: string;
    title: string;
    start_date: string;
    end_date: string;
    current: boolean;
    bullets: string;
};

export type EducationEntry = {
    id: string;
    school: string;
    degree: string;
    field: string;
    grad_year: string;
};

export type CertEntry = {
    id: string;
    name: string;
    issuer: string;
    date: string;
    expiration: string;
    credential_id: string;
};

export type ProjectEntry = {
    id: string;
    name: string;
    description: string;
    url: string;
    start_date: string;
    end_date: string;
    bullets: string;
};

export type CustomSectionEntry = {
    id: string;
    title: string;
    subtitle: string;
    start_date: string;
    end_date: string | null;
    description: string;
    bullets: string[];
};

export type CustomSection = {
    id: string;
    name: string;
    entries: CustomSectionEntry[];
};

export type SkillGroup = {
    id?: string;
    category_type?: string;
    category: string;
    items: string[];
};

export type SkillNarrative = {
    id: string;
    name: string;
    bullets: string[];
};

export type SkillsLayout = 'inline' | 'bullets' | 'grouped-vertical' | 'grouped-inline' | 'narrative';

export type ResumeTemplate =
    | 'classic'
    | 'modern'
    | 'minimal'
    | 'minimal-ruled'
    | 'executive'
    | 'ats'
    | 'skills-first'
    | 'academic'
    | 'bold';

export type FontSizes = {
    name: number;
    contact: number;
    heading: number;
    body: number;
    sectionSpacing: number;
    entrySpacing: number;
};

export type ResumeFields = {
    name: string;
    template: ResumeTemplate;
    accent_color: string | null;
    font_family: 'sans' | 'serif' | 'mono' | null;
    summary: string | null;
    contact: Contact | null;
    experience: ExperienceEntry[] | null;
    education: EducationEntry[] | null;
    projects: ProjectEntry[] | null;
    skills: string[] | null;
    skills_layout: SkillsLayout | null;
    skills_groups: SkillGroup[] | null;
    skill_narratives: SkillNarrative[] | null;
    certifications: CertEntry[] | null;
    font_sizes: FontSizes | null;
    section_order: string[] | null;
    custom_sections: CustomSection[] | null;
};

export type ResumeSummary = {
    id: number;
    name: string;
    template: string;
    pdf_filename: string;
    updated_at: string;
};

export type ResumeDetail = ResumeSummary & ResumeFields & { photo_url: string | null };

export async function listResumes(): Promise<ResumeSummary[]> {
    const { data } = await apiFetch<{ data: ResumeSummary[] }>('/api/resumes');

    return data;
}

export async function getResume(id: number): Promise<ResumeDetail> {
    return apiFetch<ResumeDetail>(`/api/resumes/${id}`);
}

export async function updateResume(id: number, data: Partial<ResumeFields>): Promise<ResumeDetail> {
    return apiFetch<ResumeDetail>(`/api/resumes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function uploadResumePhoto(id: number, uri: string): Promise<{ photo_url: string }> {
    const formData = new FormData();
    formData.append('photo', {
        uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
    } as unknown as Blob);

    return apiFetch<{ photo_url: string }>(`/api/resumes/${id}/photo`, {
        method: 'POST',
        body: formData,
    });
}

export async function deleteResumePhoto(id: number): Promise<{ photo_url: null }> {
    return apiFetch<{ photo_url: null }>(`/api/resumes/${id}/photo`, {
        method: 'DELETE',
    });
}
