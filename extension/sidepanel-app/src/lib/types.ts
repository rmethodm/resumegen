export interface ResumeVersion {
    id: number;
    version_label: string;
    updated_at: string;
}

export interface ResumeGroup {
    id: number | null;
    title: string;
    versions: ResumeVersion[];
}

export interface FillProfileContact {
    full_name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
}

export interface FillProfileLatestRole {
    title: string;
    one_liner: string;
    bullets: string[];
}

export interface FillProfile {
    resume_id: number;
    target_role: string;
    contact: FillProfileContact;
    summary: string;
    skills_csv: string;
    latest_role: FillProfileLatestRole;
    inserts: Record<string, string>;
}

export interface ExtensionUser {
    email: string;
}

export interface QuestionDraft {
    answer: string;
    source: 'qa_bank' | 'ai';
    credits_remaining?: number;
}

export interface Question {
    id: string;
    question: string;
    draft: QuestionDraft | null;
    drafting: boolean;
    saved: boolean;
}

export interface FileInputField {
    id: string;
    label: string;
}
