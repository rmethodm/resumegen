export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    is_master_admin: boolean;
    is_pro: boolean;
    two_factor_confirmed_at: string | null;
    profile: {
        full_name?: string;
        email?: string;
        phone?: string;
        location?: string;
        linkedin_url?: string;
        website?: string;
    } | null;
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

export interface CustomSectionEntry {
    id: string;
    title: string;
    subtitle: string;
    start_date: string;
    end_date: string | null;
    description: string;
    bullets: string[];
}

export interface CustomSection {
    id: string;
    name: string;
    entries: CustomSectionEntry[];
}

export type ResumeTemplate = 'classic' | 'modern' | 'minimal' | 'minimal-ruled' | 'sidebar' | 'creative' | 'executive' | 'ats' | 'skills-first' | 'skills-first-visual' | 'academic' | 'bold' | 'timeline';

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
    custom_sections: CustomSection[] | null;
    section_order: string[] | null;
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

export interface ResumeTag {
    id: number;
    label: string;
    color: string;
}

export interface ResumeRow {
    id: number;
    name: string;
    pdf_filename: string | null;
    updated_at: string;
    strength: number;
    strength_tip: string;
    view_count: number;
    ab_parent_id: number | null;
    tags: ResumeTag[];
}

export interface TemplateStatRow {
    template: string;
    views: number;
    downloads: number;
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

export interface CoverLetterSuggestion {
    id: number;
    original_text: string;
    suggested_text: string;
    reason: string;
}

export interface InterviewQuestion {
    question: string;
    hint: string;
}

export interface ResumeSnapshot {
    id: number;
    name: string;
    created_at: string;
}

export interface StrengthChecklistItem {
    label: string;
    pts: number;
    passed: boolean;
}

export interface StrengthHistoryPoint {
    score: number;
    date: string;
}

export type JobStatus = 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'closed';

export interface JobApplicationRow {
    id: number;
    company: string;
    role: string;
    status: JobStatus;
    resume_id: number | null;
    resume?: { id: number; name: string } | null;
    applied_at: string | null;
    follow_up_at: string | null;
    job_url: string | null;
    updated_at: string;
}

export interface JobApplication {
    id: number;
    user_id: number;
    resume_id: number | null;
    company: string;
    role: string;
    status: JobStatus;
    applied_at: string | null;
    follow_up_at: string | null;
    notes: string | null;
    job_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface FunnelStats {
    saved: number;
    applied: number;
    interviewing: number;
    offered: number;
    rejected: number;
    closed: number;
}

export interface InterviewNote {
    id: number;
    body: string;
    created_at: string;
}
