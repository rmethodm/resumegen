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

/** Four kept themes — keep in sync with ResumeDocument::TEMPLATES. */
export type ResumeTemplateKey =
    | 'ats-plain'
    | 'classic'
    | 'modern'
    | 'minimalist';
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
export type ResumeBulletStyle = 'bullet' | 'numbered' | 'indented';

export type Resume = {
    id: number;
    title: string;
    /** Free text — the role the resume is being scored against. */
    target_role: string;
    /** Optional company this version is tailored for (dashboard label). */
    target_company: string;
    /** Optional job-posting notes; not printed on the resume. */
    target_job_description: string;

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
    bullet_style: ResumeBulletStyle;
    section_order: ResumeSectionKey[];

    experiences: ResumeExperience[];
    projects: ResumeProject[];
    education: ResumeEducation[];
    certificates: ResumeCertificate[];
    skills: ResumeSkill[];
};

/** What the editor sends back; the id travels in the URL, not the body. */
export type ResumeDraft = Omit<Resume, 'id'>;

/**
 * Document payload plus concurrency token. `updated_at` is server-owned and
 * not written by ResumeDocument; it rides on the Inertia page for C11.
 */
export type ResumePageDocument = Resume & {
    updated_at?: string | null;
};

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

export type ResumeSuggestion = {
    /** Both null when the advice is about the resume as a whole. */
    experience: number | null;
    bullet: number | null;
    message: string;
    /** Present only when the fix is a concrete replacement bullet. */
    rewrite: string | null;
    /** The weak-opening category (e.g. "vague assistance"), null for non-opening advice. */
    category: string | null;
    /** Verbs to consider when no automatic rewrite is safe; empty otherwise. */
    verbs: string[];
    /**
     * Score band this tip improves. Client live analysis always sets it;
     * server payloads may omit it until PHP is updated.
     */
    band?: 'Profile' | 'Experience' | 'Impact' | 'Keywords';
};

export type ResumeAnalysis = {
    score: number;
    /** Four bands of 0–25: Profile, Experience, Impact, Keywords. */
    breakdown: { label: string; score: number }[];
    suggestions: ResumeSuggestion[];
};

/**
 * Badge-level share status on dashboard cards — no password, no view rows.
 * Full modal payload is loaded on demand via `resumes.share.show`.
 * Null when the resume has never had a share link created.
 */
export type DashboardShareBadge = {
    id: number;
    url: string;
    require_password: boolean;
    require_email: boolean;
    expires_at: string | null;
    view_count: number;
    is_expired: boolean;
};

/** @deprecated Prefer DashboardShareBadge — kept as an alias for older imports. */
export type DashboardShareInfo = DashboardShareBadge;

/** A dashboard row: enough to list, rank, and open the share modal. */
export type ResumeSummary = {
    id: number;
    group_id: number;
    title: string;
    target_role: string;
    updated_at: string | null;
    score: number;
    version_count: number;
    /** Share status for the newest version (card row). */
    share: DashboardShareBadge | null;
    versions: {
        id: number;
        title: string;
        target_company: string | null;
        score: number;
        is_base: boolean;
        share: DashboardShareBadge | null;
    }[];
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

/** One logged visitor email from require-email unlocks. */
export interface ResumeShareLinkView {
    email: string;
    viewed_at: string;
}

/** The Share modal's backing data (design doc turn 6, option 6a). Null until generated. */
export interface ResumeShareLink {
    id: number;
    url: string;
    allow_download: boolean;
    require_email: boolean;
    require_password: boolean;
    /** Server stores only a hash — the plaintext is never sent back. */
    has_password: boolean;
    expires_at: string | null;
    /** Recent require-email unlocks (newest first). */
    views: ResumeShareLinkView[];
    view_count: number;
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
