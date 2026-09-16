import { DEFAULT_APP_BASE, normalizeAppBase } from '../shared/app-base.js';

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse).catch((err) => {
        console.error('Resumegen Apply: unhandled message error', message?.type, err);
        sendResponse({ ok: false, reason: 'error', error: String(err?.message || err) });
    });
    return true;
});

// Phase C (one-click connect): the app's /extension/connect page sends the
// freshly-minted token here via chrome.runtime.sendMessage(extensionId, ...).
// Manifest externally_connectable scopes which origins may reach this.
chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'CONNECT_TOKEN' || !message.token) {
        sendResponse({ ok: false, reason: 'unknown_message' });
        return;
    }
    chrome.storage.sync.set({ token: message.token, appBase: message.appBase || DEFAULT_APP_BASE })
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
});

// Phase D: right-click a text selection to set it as the selected resume's
// target job description. Created once on install/update.
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'resumegen-set-jd',
            title: 'Set as Resumegen job description',
            contexts: ['selection'],
        });
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== 'resumegen-set-jd' || !info.selectionText) {
        return;
    }
    const { selectedResumeId } = await chrome.storage.local.get(['selectedResumeId']);
    if (!selectedResumeId) {
        return;
    }
    const result = await updateTargetJobDescription(selectedResumeId, info.selectionText);
    if (result.ok) {
        await chrome.storage.local.set({ lastJdImportAt: Date.now() });
        if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'DETECT_JD_BADGE', profile: null }).catch(() => {});
        }
    }
});

async function handleMessage(message) {
    switch (message.type) {
        case 'GET_CONFIG':
            return { ok: true, ...(await getConfig()) };
        case 'TEST_CONNECTION':
            return testConnection(message.token, message.appBase);
        case 'FETCH_RESUMES':
            return fetchResumes();
        case 'FETCH_FILL_PROFILE':
            return fetchFillProfile(message.resumeId);
        case 'SCAN_PAGE':
            return scanPage(message.tabId, message.profile);
        case 'FILL_COMMON_FIELDS':
            return fillCommonFields(message.tabId, message.profile, message.selectedKeys);
        case 'GET_FOCUS_CONTEXT':
            return getFocusContext(message.tabId, message.profile);
        case 'INSERT_FOCUSED':
            return insertFocused(message.tabId, message.text, message.label);
        case 'DETECT_QUESTIONS':
            return detectQuestions(message.tabId, message.profile);
        case 'DRAFT_QA_ANSWER':
            return draftQaAnswer(message.question, message.resumeId);
        case 'INSERT_QA_DRAFT':
            return insertQaDraft(message.tabId, message.id, message.text);
        case 'SAVE_QA_BANK_ENTRY':
            return saveQaBankEntry(message.question, message.answer);
        case 'DETECT_JOB_POSTING':
            return detectJobPosting(message.tabId);
        case 'SAVE_JOB_APPLICATION':
            return saveJobApplication(message.company, message.role, message.jobUrl);
        case 'UPDATE_TARGET_JD':
            return updateTargetJobDescription(message.resumeId, message.text);
        case 'DETECT_JD_BADGE':
            return detectJdBadge(message.tabId, message.profile);
        case 'DETECT_FILE_INPUTS':
            return detectFileInputs(message.tabId);
        case 'ATTACH_RESUME_PDF':
            return attachResumePdf(message.tabId, message.fieldId, message.resumeId);
        case 'OPEN_APP':
            return openApp(message.path || '/dashboard');
        case 'DISCONNECT':
            await chrome.storage.sync.remove(['token']);
            await chrome.storage.local.remove(['selectedGroupId', 'selectedResumeId', 'lastProfile']);
            return { ok: true };
        default:
            return { ok: false, reason: 'unknown_message' };
    }
}

async function getConfig() {
    const { token, appBase } = await chrome.storage.sync.get(['token', 'appBase']);
    const base = normalizeAppBase(appBase || DEFAULT_APP_BASE);
    return { token: token || '', appBase: base, apiBase: `${base}/api` };
}

async function apiFetch(path, options = {}) {
    const { token, apiBase } = await getConfig();
    if (!token) {
        return { ok: false, reason: 'no_token', status: 0 };
    }

    try {
        const res = await fetch(`${apiBase}${path}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
                ...(options.headers || {}),
            },
        });

        if (res.status === 401) {
            return { ok: false, reason: 'unauthorized', status: 401 };
        }

        if (res.status === 403) {
            const body = await res.json().catch(() => ({}));
            return { ok: false, reason: 'forbidden', status: 403, body };
        }

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return { ok: false, reason: `http_${res.status}`, status: res.status, body };
        }

        const data = await res.json();
        return { ok: true, data, status: res.status };
    } catch (err) {
        return { ok: false, reason: 'network_error', error: err.message, status: 0 };
    }
}

async function apiFetchBlob(path) {
    const { token, apiBase } = await getConfig();
    if (!token) {
        return { ok: false, reason: 'no_token', status: 0 };
    }

    try {
        const res = await fetch(`${apiBase}${path}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
            return { ok: false, reason: `http_${res.status}`, status: res.status };
        }

        const disposition = res.headers.get('content-disposition') || '';
        const match = disposition.match(/filename="?([^";]+)"?/i);
        const filename = match ? match[1] : 'resume.pdf';

        const buffer = await res.arrayBuffer();
        return { ok: true, buffer, filename, status: res.status };
    } catch (err) {
        return { ok: false, reason: 'network_error', error: err.message, status: 0 };
    }
}

async function testConnection(tokenOverride, appBaseOverride) {
    const stored = await getConfig();
    const token = tokenOverride ?? stored.token;
    const apiBase = `${normalizeAppBase(appBaseOverride || stored.appBase)}/api`;

    if (!token) {
        return { ok: false, reason: 'no_token' };
    }

    try {
        const res = await fetch(`${apiBase}/extension/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        });

        if (res.status === 401) {
            return { ok: false, reason: 'unauthorized' };
        }
        if (!res.ok) {
            return { ok: false, reason: `http_${res.status}` };
        }

        const data = await res.json();
        return { ok: true, name: data.name, email: data.email };
    } catch (err) {
        return { ok: false, reason: 'network_error', error: err.message };
    }
}

async function fetchResumes() {
    return apiFetch('/extension/resumes');
}

async function fetchFillProfile(resumeId) {
    if (!resumeId) {
        return { ok: false, reason: 'no_resume' };
    }
    const result = await apiFetch(`/extension/resumes/${resumeId}/fill-profile`);
    if (result.ok) {
        await chrome.storage.local.set({ lastProfile: result.data, selectedResumeId: resumeId });
    }
    return result;
}

async function ensureContentScript(tabId) {
    try {
        await chrome.tabs.sendMessage(tabId, { type: 'PING' });
        return true;
    } catch {
        const tab = await chrome.tabs.get(tabId);
        if (!tab.url || !/^https?:\/\//.test(tab.url)) {
            throw new Error('This page cannot be filled.');
        }

        // Heuristics first, then fill runner (depends on ResumegenHeuristics global).
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content/fill-heuristics.js', 'content/fill.js'],
        });
        return true;
    }
}

async function scanPage(tabId, profile) {
    const id = tabId || (await activeTabId());
    if (!id) {
        return { ok: false, reason: 'no_tab' };
    }

    try {
        await ensureContentScript(id);
        const result = await chrome.tabs.sendMessage(id, { type: 'SCAN_FIELDS', profile });
        return { ok: true, ...(result || {}) };
    } catch (err) {
        return { ok: false, reason: 'scan_failed', error: err.message, message: 'Could not scan this page.' };
    }
}

async function fillCommonFields(tabId, profile, selectedKeys = null) {
    const id = tabId || (await activeTabId());
    if (!id) {
        return { ok: false, reason: 'no_tab' };
    }

    try {
        await ensureContentScript(id);
        const result = await chrome.tabs.sendMessage(id, {
            type: 'FILL_COMMON',
            profile,
            selectedKeys,
        });
        return { ok: true, ...(result || {}) };
    } catch (err) {
        return {
            ok: false,
            reason: 'inject_failed',
            error: err.message,
            message: 'No fillable fields found on this page',
        };
    }
}

async function getFocusContext(tabId, profile) {
    const id = tabId || (await activeTabId());
    if (!id) {
        return { ok: false, reason: 'no_tab' };
    }

    try {
        await ensureContentScript(id);
        const result = await chrome.tabs.sendMessage(id, { type: 'GET_FOCUS_CONTEXT', profile });
        return { ok: true, ...(result || {}) };
    } catch (err) {
        return { ok: false, reason: 'focus_context_failed', error: err.message, message: 'Could not read the focused field.' };
    }
}

async function insertFocused(tabId, text, label) {
    const id = tabId || (await activeTabId());
    if (!id) {
        return { ok: false, reason: 'no_tab' };
    }

    try {
        await ensureContentScript(id);
        const result = await chrome.tabs.sendMessage(id, {
            type: 'INSERT_FOCUSED',
            text,
            label,
        });
        return { ok: true, ...(result || {}) };
    } catch (err) {
        return {
            ok: false,
            reason: 'inject_failed',
            error: err.message,
            message: 'Click a text field on the page first, then insert.',
        };
    }
}

async function detectQuestions(tabId, profile) {
    const id = tabId || (await activeTabId());
    if (!id) {
        return { ok: false, reason: 'no_tab' };
    }

    try {
        await ensureContentScript(id);
        const result = await chrome.tabs.sendMessage(id, { type: 'DETECT_QUESTIONS', profile });
        return { ok: true, ...(result || {}) };
    } catch (err) {
        return { ok: false, reason: 'detect_failed', error: err.message, message: 'Could not scan this page for questions.' };
    }
}

async function draftQaAnswer(question, resumeId) {
    return apiFetch('/extension/qa-bank/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, resume_id: resumeId }),
    });
}

async function insertQaDraft(tabId, id, text) {
    const tid = tabId || (await activeTabId());
    if (!tid) {
        return { ok: false, reason: 'no_tab' };
    }

    try {
        await ensureContentScript(tid);
        const result = await chrome.tabs.sendMessage(tid, { type: 'INSERT_QA_DRAFT', id, text });
        return { ok: true, ...(result || {}) };
    } catch (err) {
        return {
            ok: false,
            reason: 'inject_failed',
            error: err.message,
            message: 'Re-scan the page and try again.',
        };
    }
}

async function saveQaBankEntry(question, answer) {
    return apiFetch('/extension/qa-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer }),
    });
}

async function detectJobPosting(tabId) {
    const id = tabId || (await activeTabId());
    if (!id) {
        return { ok: false, reason: 'no_tab' };
    }

    try {
        const [{ result: meta }] = await chrome.scripting.executeScript({
            target: { tabId: id },
            func: () => ({
                title: document.title,
                ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
                ogSiteName: document.querySelector('meta[property="og:site_name"]')?.content || '',
                url: location.href,
            }),
        });
        return { ok: true, meta, url: meta.url };
    } catch (err) {
        return { ok: false, reason: 'detect_failed', error: err.message, message: 'Could not read this page.' };
    }
}

async function saveJobApplication(company, role, jobUrl) {
    return apiFetch('/extension/job-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, role, job_url: jobUrl }),
    });
}

async function updateTargetJobDescription(resumeId, text) {
    if (!resumeId) {
        return { ok: false, reason: 'no_resume' };
    }
    return apiFetch(`/extension/resumes/${resumeId}/target-job-description`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_job_description: text }),
    });
}

async function ensureJdBadgeScript(tabId) {
    try {
        await chrome.tabs.sendMessage(tabId, { type: 'PING' });
        return true;
    } catch {
        const tab = await chrome.tabs.get(tabId);
        if (!tab.url || !/^https?:\/\//.test(tab.url)) {
            throw new Error('This page cannot show a badge.');
        }
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['shared/jd-keyword-overlap.js', 'content/jd-badge.js'],
        });
        return true;
    }
}

async function detectJdBadge(tabId, profile) {
    const id = tabId || (await activeTabId());
    if (!id) {
        return { ok: false, reason: 'no_tab' };
    }

    try {
        await ensureJdBadgeScript(id);
        const result = await chrome.tabs.sendMessage(id, { type: 'DETECT_JD_BADGE', profile });
        return { ok: true, ...(result || {}) };
    } catch (err) {
        return { ok: false, reason: 'badge_failed', error: err.message, message: 'Could not show a match badge on this page.' };
    }
}

async function detectFileInputs(tabId) {
    const id = tabId || (await activeTabId());
    if (!id) {
        return { ok: false, reason: 'no_tab' };
    }

    try {
        await ensureContentScript(id);
        const result = await chrome.tabs.sendMessage(id, { type: 'DETECT_FILE_INPUTS' });
        return { ok: true, ...(result || {}) };
    } catch (err) {
        return { ok: false, reason: 'detect_failed', error: err.message, message: 'Could not scan this page for a resume upload.' };
    }
}

async function attachResumePdf(tabId, fieldId, resumeId) {
    const id = tabId || (await activeTabId());
    if (!id) {
        return { ok: false, reason: 'no_tab' };
    }
    if (!resumeId) {
        return { ok: false, reason: 'no_resume' };
    }

    const pdf = await apiFetchBlob(`/extension/resumes/${resumeId}/pdf`);
    if (!pdf.ok) {
        return pdf;
    }

    try {
        await ensureContentScript(id);
        const result = await chrome.tabs.sendMessage(id, {
            type: 'SET_FILE_INPUT',
            id: fieldId,
            buffer: pdf.buffer,
            filename: pdf.filename,
        });
        return { ok: true, ...(result || {}) };
    } catch (err) {
        return {
            ok: false,
            reason: 'attach_failed',
            error: err.message,
            message: 'This site rejected the automatic attach — download and upload it manually.',
        };
    }
}

async function activeTabId() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.id;
}

async function openApp(path) {
    const { appBase } = await getConfig();
    const url = `${appBase}${path.startsWith('/') ? path : `/${path}`}`;
    await chrome.tabs.create({ url });
    return { ok: true };
}
