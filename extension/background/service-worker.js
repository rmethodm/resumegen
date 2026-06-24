const DEFAULT_API_BASE = 'https://resumegen.app/api';

// ── Alarm setup ───────────────────────────────────────────────────────────────
// Registered at top level so it persists across service worker restarts.
chrome.alarms.create('poll', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'poll') {
        pollActivity();
    }
});

// ── Message handlers ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_ACTIVITY') {
        pollActivity().then(sendResponse);
        return true;
    }
    if (message.type === 'REPLY_THREAD') {
        replyToThread(message.threadId, message.body).then(sendResponse);
        return true;
    }
});

// ── Core functions ────────────────────────────────────────────────────────────

async function getConfig() {
    const { token, apiBase } = await chrome.storage.sync.get(['token', 'apiBase']);
    return {
        token,
        base: (apiBase || DEFAULT_API_BASE).replace(/\/$/, ''),
    };
}

async function pollActivity() {
    const { token, base } = await getConfig();
    if (!token) return { ok: false, reason: 'no_token' };

    try {
        const res = await fetch(`${base}/activity`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        });

        if (res.status === 401) {
            await chrome.storage.local.set({ authError: true });
            updateBadge(0);
            return { ok: false, reason: 'unauthorized' };
        }

        if (!res.ok) {
            return { ok: false, reason: `http_${res.status}` };
        }

        const data = await res.json();
        await chrome.storage.local.set({ activity: data, authError: false, lastFetched: Date.now() });
        updateBadge(data.unread_count ?? 0);
        return { ok: true, data };
    } catch (err) {
        return { ok: false, reason: 'network_error', error: err.message };
    }
}

async function replyToThread(threadId, body) {
    const { token, base } = await getConfig();

    try {
        const res = await fetch(`${base}/threads/${threadId}/reply`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ body }),
        });
        const responseBody = await res.json().catch(() => ({}));
        return { status: res.status, body: responseBody };
    } catch (err) {
        return { status: 0, error: err.message };
    }
}

function updateBadge(count) {
    if (count > 0) {
        chrome.action.setBadgeText({ text: String(count) });
        chrome.action.setBadgeBackgroundColor({ color: '#4f46e5' });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}
