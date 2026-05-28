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

export type ResumeTemplate = 'classic' | 'modern' | 'minimal' | 'minimal-ruled' | 'sidebar' | 'creative' | 'executive' | 'ats';

export interface FontSizes {
    name: number;
    contact: number;
    heading: number;
    body: number;
    sectionSpacing: number;
    entrySpacing: number;
}

export interface ResumeData {
    id: number;
    name: string;
    pdf_filename: string | null;
    template: ResumeTemplate;
    accent_color: string | null;
    font_family: 'sans' | 'serif' | 'mono' | null;
    contact: Contact | null;
    summary: string | null;
    experience: ExperienceEntry[] | null;
    education: EducationEntry[] | null;
    skills: string[] | null;
    certifications: CertEntry[] | null;
    font_sizes: FontSizes | null;
}

export interface ShareLink {
    id: number;
    token: string;
    label: string | null;
    is_active: boolean;
    expires_at: string | null;
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

export interface AiCapabilities {
    claude: boolean;
    openai: boolean;
}

export interface AISuggestContext {
    summary?: string;
    title?: string;
    company?: string;
    bullets?: string;
    skills?: string[];
}

export interface ResumeStat {
    resume_id: number;
    resume_name: string;
    page_views: number;
    unique_visitors: number;
    pdf_downloads: number;
    questions_submitted: number;
}

export interface AtsScoreCategory {
    action_verbs: string[];
    technical: string[];
    soft_skills: string[];
}

export interface AtsScore {
    score: number;
    found: AtsScoreCategory;
    missing: AtsScoreCategory;
    breakdown: {
        action_verbs: number;
        technical: number;
        soft_skills: number;
        format_signals: number;
    };
}

export interface CoverLetterRow {
    id: number;
    name: string;
    template_key: string;
    resume_id: number | null;
    updated_at: string;
}

export interface CoverLetterTemplateOption {
    key: string;
    label: string;
    description: string;
}

export interface CoverLetter {
    id: number;
    user_id: number;
    resume_id: number | null;
    name: string;
    template_key: string;
    body: string;
    created_at: string;
    updated_at: string;
}
