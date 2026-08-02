export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
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
    created_at: string;
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

export interface ApplicationContact {
    id: number;
    name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    created_at: string;
}

