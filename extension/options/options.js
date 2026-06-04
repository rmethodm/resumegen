const tokenInput = document.getElementById('token');
const apiBaseInput = document.getElementById('apiBase');
const saveBtn = document.getElementById('save');
const testBtn = document.getElementById('test');
const statusEl = document.getElementById('status');

function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = `status ${type}`;
}

chrome.storage.sync.get(['token', 'apiBase'], ({ token, apiBase }) => {
    if (token) tokenInput.value = token;
    if (apiBase) apiBaseInput.value = apiBase;
});

saveBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    const apiBase = apiBaseInput.value.trim();
    chrome.storage.sync.set({ token, apiBase }, () => {
        showStatus('Settings saved.', 'success');
    });
});

testBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    const apiBase = apiBaseInput.value.trim();
    if (!token) { showStatus('Enter a token first.', 'error'); return; }
    showStatus('Testing…', '');
    chrome.runtime.sendMessage(
        { type: 'TEST_TOKEN', token, apiBase },
        (res) => {
            if (res?.success) {
                showStatus(`Connected as ${res.name}.`, 'success');
            } else {
                showStatus('Connection failed — check your token and URL.', 'error');
            }
        }
    );
});
