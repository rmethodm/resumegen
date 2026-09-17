import { useCallback, useState } from 'react';
import { sendMessage } from '@/lib/chrome-messaging';
import type { ExtensionUser, FillProfile, ResumeGroup } from '@/lib/types';

export type ResumesStatus = 'idle' | 'loading' | 'empty' | 'ready' | 'auth_error' | 'error';

interface State {
    status: ResumesStatus;
    groups: ResumeGroup[];
    user: ExtensionUser | null;
    selectedGroupId: number | null;
    selectedResumeId: number | null;
    profile: FillProfile | null;
    errorMessage: string;
}

const initialState: State = {
    status: 'idle',
    groups: [],
    user: null,
    selectedGroupId: null,
    selectedResumeId: null,
    profile: null,
    errorMessage: '',
};

function groupKey(id: number | null): string {
    return id == null ? '0' : String(id);
}

export function useResumes() {
    const [state, setState] = useState<State>(initialState);

    const loadProfile = useCallback(async (resumeId: number | null) => {
        if (!resumeId) {
            setState((s) => ({ ...s, profile: null }));
            return;
        }

        const result = await sendMessage<{ data: FillProfile }>('FETCH_FILL_PROFILE', { resumeId });

        if (!result.ok) {
            if (result.reason === 'unauthorized') {
                setState((s) => ({ ...s, status: 'auth_error' }));
                return;
            }
            setState((s) => ({
                ...s,
                profile: null,
                errorMessage: "Couldn't load resume data. Check your connection and try again.",
            }));
            return;
        }

        const profile = result.data as FillProfile;
        setState((s) => ({ ...s, profile, selectedResumeId: profile.resume_id, errorMessage: '' }));
        await chrome.storage.local.set({ selectedResumeId: profile.resume_id });
    }, []);

    const load = useCallback(async () => {
        setState((s) => ({ ...s, status: 'loading', errorMessage: '' }));

        const result = await sendMessage<{ data: { groups: ResumeGroup[]; user: ExtensionUser | null } }>('FETCH_RESUMES');

        if (!result.ok) {
            if (result.reason === 'no_token' || result.reason === 'unauthorized') {
                setState((s) => ({ ...s, status: 'auth_error' }));
                return;
            }
            setState((s) => ({
                ...s,
                status: 'error',
                errorMessage: "Couldn't load resume data. Check your connection and try again.",
            }));
            return;
        }

        const groups = result.data.groups || [];
        const user = result.data.user || null;

        if (groups.length === 0) {
            setState((s) => ({ ...s, status: 'empty', groups, user }));
            return;
        }

        const stored = await chrome.storage.local.get(['selectedGroupId', 'selectedResumeId']);
        const group = groups.find((g) => groupKey(g.id) === groupKey(stored.selectedGroupId)) || groups[0];
        const version = group.versions.find((v) => String(v.id) === String(stored.selectedResumeId)) || group.versions[0];
        const selectedGroupId = group.id;
        const selectedResumeId = version?.id ?? null;

        await chrome.storage.local.set({ selectedGroupId, selectedResumeId });
        setState((s) => ({ ...s, status: 'ready', groups, user, selectedGroupId, selectedResumeId }));
        await loadProfile(selectedResumeId);
    }, [loadProfile]);

    const selectGroup = useCallback(async (groupId: number | null) => {
        const group = state.groups.find((g) => groupKey(g.id) === groupKey(groupId)) || state.groups[0];
        const resumeId = group?.versions?.[0]?.id ?? null;

        setState((s) => ({ ...s, selectedGroupId: groupId, selectedResumeId: resumeId }));
        await chrome.storage.local.set({ selectedGroupId: groupId, selectedResumeId: resumeId });
        await loadProfile(resumeId);
    }, [state.groups, loadProfile]);

    const selectResume = useCallback(async (resumeId: number) => {
        setState((s) => ({ ...s, selectedResumeId: resumeId }));
        await chrome.storage.local.set({ selectedResumeId: resumeId });
        await loadProfile(resumeId);
    }, [loadProfile]);

    return { ...state, load, selectGroup, selectResume };
}
