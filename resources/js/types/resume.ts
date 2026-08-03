export type ResumeExperience = {
    title: string;
    company: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    bullets: string[];
};

export type ResumeProject = {
    name: string;
    url: string;
    start_date: string;
    end_date: string;
    description: string;
    highlights: string[];
};

export type ResumeEducation = {
    school: string;
    degree: string;
    field: string;
    graduation_year: string;
};

export type ResumeCertificate = {
    name: string;
    issuer: string;
    obtained_at: string;
    expires_at: string;
    credential_id: string;
};

/** Category is free text; '' means the skill is uncategorised. */
export type ResumeSkill = {
    category: string;
    name: string;
};

/** One category of the pickable skill catalogue. See LibrarySkill::catalogue. */
export type SkillLibraryGroup = {
    kind: 'soft' | 'hard';
    category: string;
    skills: string[];
};

/** Must stay in step with Resume::SECTIONS. */
export type ResumeSectionKey =
    | 'contact'
    | 'summary'
    | 'experience'
    | 'project'
    | 'education'
    | 'skills'
    | 'certificate';

export type ResumeTemplateKey =
    | 'minimal'
    | 'modern'
    | 'classic'
    | 'executive'
    | 'ats'
    | 'skills-first'
    | 'reverse-chronological'
    | 'ats-plain'
    | 'minimalist'
    | 'engineering'
    | 'ivy-serif'
    | 'clinical'
    | 'career-change'
    | 'entry-level'
    | 'metric-cards'
    | 'sales-quota-table'
    | 'federal'
    | 'academic-cv'
    | 'accent-rule'
    | 'consulting-ledger'
    | 'education'
    | 'startup-one-pager'
    | 'it-competency-matrix'
    | 'centered-traditional';
export type ResumeFont =
    | 'inter'
    | 'arial'
    | 'calibri'
    | 'open-sans'
    | 'lato'
    | 'roboto'
    | 'montserrat'
    | 'georgia'
    | 'garamond'
    | 'cambria'
    | 'times'
    | 'ibm-plex-sans'
    | 'work-sans'
    | 'eb-garamond'
    | 'ibm-plex-mono'
    | 'libre-baskerville'
    | 'source-serif-4'
    | 'figtree';
export type ResumeDensity = 'compact' | 'balanced' | 'spacious';
export type ResumeSkillsLayout =
    'inline' | 'bullets' | 'grouped' | 'columns' | 'narrative';

export type Resume = {
    id: number;
    title: string;
    /** Free text — the role the resume is being scored against. */
    target_role: string;

    full_name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    website: string;
    summary: string;

    template: ResumeTemplateKey;
    font: ResumeFont;
    density: ResumeDensity;
    skills_layout: ResumeSkillsLayout;
    section_order: ResumeSectionKey[];

    experiences: ResumeExperience[];
    projects: ResumeProject[];
    education: ResumeEducation[];
    certificates: ResumeCertificate[];
    skills: ResumeSkill[];
};

/** What the editor sends back; the id travels in the URL, not the body. */
export type ResumeDraft = Omit<Resume, 'id'>;

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

export type ResumeSuggestion = {
    /** Both null when the advice is about the resume as a whole. */
    experience: number | null;
    bullet: number | null;
    message: string;
    /** Present only when the fix is a concrete replacement bullet. */
    rewrite: string | null;
};

export type ResumeAnalysis = {
    score: number;
    suggestions: ResumeSuggestion[];
};

/** A dashboard row: enough to list, rank, and render a card preview. */
export type ResumeSummary = {
    id: number;
    group_id: number;
    title: string;
    target_role: string;
    updated_at: string | null;
    score: number;
    version_count: number;
    versions: {
        id: number;
        title: string;
        target_company: string | null;
        score: number;
        is_base: boolean;
    }[];
    /** The full document, for the dashboard card's live preview thumbnail. */
    preview: Resume;
};

/** One entry in the workstation's version switcher. */
export interface ResumeVersion {
    id: number;
    title: string;
    score: number;
    is_current: boolean;
    has_notes: boolean;
}

/** The group a resume's versions belong to. */
export interface ResumeVersionGroup {
    id: number;
    title: string;
}

/** The Share modal's backing data (design doc turn 6, option 6a). Null until generated. */
export interface ResumeShareLink {
    id: number;
    url: string;
    allow_download: boolean;
    require_email: boolean;
    require_password: boolean;
    password: string | null;
    expires_at: string | null;
}

export interface StarterProfileExperience {
    title: string;
    company: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    bullets: string[];
}

export interface StarterProfileSkill {
    category: string;
    name: string;
}

/** The reusable content seed a new resume is pre-filled from. See StarterProfile. */
export interface StarterProfile {
    full_name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    target_role: string;
    linkedin: string;
    website: string;
    experience_snapshot: StarterProfileExperience[] | null;
    skills: StarterProfileSkill[] | null;
}
