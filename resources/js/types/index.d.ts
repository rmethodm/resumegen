export type * from './resume';

export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    is_admin?: boolean;
    disabled_at?: string | null;
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

export interface SkillGroup {
    id?: string;
    category_type?: string;
    category: string;
    items: string[];
}

export type SkillsLayout = 'inline' | 'bullets' | 'grouped-vertical' | 'grouped-inline' | 'narrative';

export interface SkillNarrative {
    id: string;
    name: string;
    bullets: string[];
}

export type ResumeTemplate = 'classic' | 'modern' | 'minimal' | 'minimal-ruled' | 'executive' | 'ats' | 'skills-first' | 'academic' | 'bold';

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
    target_job_description: string | null;
    target_company: string | null;
    target_title: string | null;
    experience: ExperienceEntry[] | null;
    education: EducationEntry[] | null;
    skills: string[] | null;
    skills_layout: SkillsLayout | null;
    skills_groups: SkillGroup[] | null;
    skill_narratives: SkillNarrative[] | null;
    certifications: CertEntry[] | null;
    projects: ProjectEntry[] | null;
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

export interface InterviewQuestion {
    question: string;
    hint: string;
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

export type JobStatus = 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected';

export interface JobApplication {
    id: number;
    company: string;
    role: string;
    status: JobStatus;
    resume_id: number | null;
    job_url: string | null;
    notes: string | null;
    applied_at: string | null;
    follow_up_at: string | null;
    created_at: string | null;
}

