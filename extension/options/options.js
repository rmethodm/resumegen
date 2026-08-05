const tokenInput = document.getElementById('token');
const appBaseInput = document.getElementById('appBase');
const saveBtn = document.getElementById('save');
const testBtn = document.getElementById('test');
const openProfileBtn = document.getElementById('open-profile');
const statusEl = document.getElementById('status');

const DEFAULT_APP_BASE = 'https://resumegen.test';

function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = `status ${type || ''}`;
}

function normalizeAppBase(value) {
    let base = String(value || DEFAULT_APP_BASE).trim().replace(/\/$/, '');
    if (base.endsWith('/api')) {
        base = base.slice(0, -4);
    }
    return base || DEFAULT_APP_BASE;
}

chrome.storage.sync.get(['token', 'appBase'], ({ token, appBase }) => {
    if (token) {
        tokenInput.value = token;
    }
    appBaseInput.value = appBase || DEFAULT_APP_BASE;
});

saveBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    const appBase = normalizeAppBase(appBaseInput.value);
    chrome.storage.sync.set({ token, appBase }, () => {
        showStatus('Settings saved.', 'success');
    });
});

testBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    const appBase = normalizeAppBase(appBaseInput.value);
    if (!token) {
        showStatus('Enter a token first.', 'error');
        return;
    }
    showStatus('Testing…', '');
    chrome.runtime.sendMessage(
        { type: 'TEST_CONNECTION', token, appBase },
        (res) => {
            if (chrome.runtime.lastError) {
                showStatus(chrome.runtime.lastError.message, 'error');
                return;
            }
            if (res?.ok) {
                showStatus(`Connected as ${res.name || res.email || 'user'}.`, 'success');
            } else if (res?.reason === 'unauthorized') {
                showStatus('Token invalid — generate a new one on Profile.', 'error');
            } else {
                showStatus('Connection failed — check your token and URL.', 'error');
            }
        },
    );
});

openProfileBtn.addEventListener('click', () => {
    const appBase = normalizeAppBase(appBaseInput.value || DEFAULT_APP_BASE);
    chrome.tabs.create({ url: `${appBase}/profile` });
});
