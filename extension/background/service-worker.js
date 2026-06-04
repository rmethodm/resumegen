const DEFAULT_API_BASE = 'https://resumegen.app/api';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'SAVE_JOB') {
        saveJob(message.data).then(sendResponse);
        return true;
    }
    if (message.type === 'TEST_TOKEN') {
        testToken(message.token, message.apiBase).then(sendResponse);
        return true;
    }
});

async function saveJob(data) {
    const { token, apiBase } = await chrome.storage.sync.get(['token', 'apiBase']);
    const base = (apiBase || DEFAULT_API_BASE).replace(/\/$/, '');
    try {
        const res = await fetch(`${base}/jobs`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(data),
        });
        const body = await res.json().catch(() => ({}));
        return { status: res.status, body };
    } catch (err) {
        return { status: 0, error: err.message };
    }
}

async function testToken(token, apiBase) {
    const base = (apiBase || DEFAULT_API_BASE).replace(/\/$/, '');
    try {
        const res = await fetch(`${base}/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        });
        if (res.ok) {
            const data = await res.json();
            return { success: true, name: data.name };
        }
        return { success: false };
    } catch {
        return { success: false };
    }
}
