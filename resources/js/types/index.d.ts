export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
}

export interface Contact {
    full_name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    website: string;
}

export interface ExperienceEntry {
    id: string;
    company: string;
    title: string;
    start_date: string;
    end_date: string;
    current: boolean;
    bullets: string;
}

export interface EducationEntry {
    id: string;
    school: string;
    degree: string;
    field: string;
    grad_year: string;
}

export interface CertEntry {
    id: string;
    name: string;
    issuer: string;
    date: string;
}

export type ResumeTemplate = 'classic' | 'modern' | 'minimal';

export interface ResumeData {
    id: number;
    name: string;
    pdf_filename: string | null;
    template: ResumeTemplate;
    contact: Contact | null;
    summary: string | null;
    experience: ExperienceEntry[] | null;
    education: EducationEntry[] | null;
    skills: string[] | null;
    certifications: CertEntry[] | null;
}

export interface ShareLink {
    id: number;
    token: string;
    label: string | null;
    is_active: boolean;
    created_at: string;
}

export interface ResumeQuestion {
    id: number;
    sender_name: string;
    sender_email: string;
    sender_phone: string;
    message: string;
    is_read: boolean;
    link_label: string;
    created_at: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
};
