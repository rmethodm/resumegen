const DEFAULT_APP_BASE = 'https://resumegen.test';

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse).catch((err) => {
        sendResponse({ ok: false, reason: 'error', error: String(err?.message || err) });
    });
    return true;
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
        case 'FILL_COMMON_FIELDS':
            return fillCommonFields(message.tabId, message.profile);
        case 'INSERT_FOCUSED':
            return insertFocused(message.tabId, message.text, message.label);
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

function normalizeAppBase(value) {
    let base = String(value || DEFAULT_APP_BASE).trim().replace(/\/$/, '');
    if (base.endsWith('/api')) {
        base = base.slice(0, -4);
    }
    return base || DEFAULT_APP_BASE;
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
            return { ok: false, reason: `http_${res.status}`, status: res.status };
        }

        const data = await res.json();
        return { ok: true, data, status: res.status };
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
        // Heuristics first, then fill runner (depends on ResumegenHeuristics global).
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content/fill-heuristics.js', 'content/fill.js'],
        });
        return true;
    }
}

async function fillCommonFields(tabId, profile) {
    const id = tabId || (await activeTabId());
    if (!id) {
        return { ok: false, reason: 'no_tab' };
    }

    try {
        await ensureContentScript(id);
        const result = await chrome.tabs.sendMessage(id, {
            type: 'FILL_COMMON',
            profile,
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
