// ── State ─────────────────────────────────────────────────────────────────────
let activityData = { events: [], threads: [], unread_count: 0 };
let activeThreadId = null;

// ── DOM helpers ───────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function showView(id) {
    for (const el of document.querySelectorAll('.view')) {
        el.classList.add('hidden');
    }
    $(id).classList.remove('hidden');
}

function relativeTime(iso) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// ── Dismiss logic ─────────────────────────────────────────────────────────────
async function getDismissed() {
    const { dismissedThreadIds } = await chrome.storage.local.get('dismissedThreadIds');
    return new Set(dismissedThreadIds || []);
}

async function dismissThread(id) {
    const dismissed = await getDismissed();
    dismissed.add(id);
    await chrome.storage.local.set({ dismissedThreadIds: [...dismissed] });
}

// ── Render feed ───────────────────────────────────────────────────────────────
async function renderFeed() {
    const dismissed = await getDismissed();
    const threads = (activityData.threads || [])
        .filter((t) => !dismissed.has(t.id))
        .sort((a, b) => (a.is_read === b.is_read ? 0 : a.is_read ? 1 : -1));
    const events = activityData.events || [];

    // Threads
    const threadsList = $('threads-list');
    threadsList.innerHTML = '';
    $('threads-empty').classList.toggle('hidden', threads.length > 0);

    for (const t of threads) {
        const lastMsg = t.messages[t.messages.length - 1];
        const preview = lastMsg ? lastMsg.body.slice(0, 60) + (lastMsg.body.length > 60 ? '…' : '') : '';

        const li = document.createElement('li');
        li.className = 'thread-row';
        li.innerHTML = `
            <div class="thread-dot ${t.is_read ? 'read' : ''}"></div>
            <div class="thread-body">
                <div class="thread-sender">${escHtml(t.sender_name)}</div>
                <div class="thread-resume">${escHtml(t.resume_name)}</div>
                <div class="thread-preview">${escHtml(preview)}</div>
            </div>
            <button class="thread-dismiss" data-id="${t.id}" title="Dismiss">×</button>
        `;

        li.querySelector('.thread-body').addEventListener('click', () => openConversation(t.id));
        li.querySelector('.thread-dismiss').addEventListener('click', async (e) => {
            e.stopPropagation();
            await dismissThread(t.id);
            li.remove();
            if (threadsList.children.length === 0) {
                $('threads-empty').classList.remove('hidden');
            }
        });

        threadsList.appendChild(li);
    }

    // Events
    const eventsList = $('events-list');
    eventsList.innerHTML = '';
    $('events-empty').classList.toggle('hidden', events.length > 0);

    for (const ev of events) {
        const icon = ev.type === 'pdf_download' ? '⬇' : '👁';
        const label = ev.type === 'pdf_download' ? 'PDF downloaded' : 'Viewed';
        const li = document.createElement('li');
        li.className = 'event-row';
        li.innerHTML = `
            <span class="event-icon">${icon}</span>
            <div class="event-text">
                <div class="event-resume">${escHtml(ev.resume_name)}</div>
                <div class="event-time">${label} · ${relativeTime(ev.occurred_at)}</div>
            </div>
        `;
        eventsList.appendChild(li);
    }
}

function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Render conversation ───────────────────────────────────────────────────────
function openConversation(threadId) {
    activeThreadId = threadId;
    const thread = activityData.threads.find((t) => t.id === threadId);
    if (!thread) return;

    $('convo-header').innerHTML = `
        <div>${escHtml(thread.sender_name)}</div>
        <div class="sub">${escHtml(thread.resume_name)}</div>
    `;

    renderMessages(thread.messages);
    $('reply-body').value = '';
    $('reply-error').classList.add('hidden');
    $('reply-error').textContent = '';
    showView('convo-view');
    $('convo-messages').scrollTop = $('convo-messages').scrollHeight;
}

function renderMessages(messages) {
    const container = $('convo-messages');
    container.innerHTML = '';
    for (const m of messages) {
        const side = m.is_owner ? 'owner' : 'visitor';
        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <div class="msg-bubble ${side}">${escHtml(m.body)}</div>
            <div class="msg-time ${m.is_owner ? 'right' : ''}">${relativeTime(m.created_at)}</div>
        `;
        container.appendChild(wrap);
    }
    container.scrollTop = container.scrollHeight;
}

// ── Send reply ────────────────────────────────────────────────────────────────
$('send-btn').addEventListener('click', async () => {
    const body = $('reply-body').value.trim();
    if (!body) return;

    $('reply-error').classList.add('hidden');
    $('send-btn').disabled = true;
    $('send-btn').textContent = 'Sending…';

    const res = await chrome.runtime.sendMessage({
        type: 'REPLY_THREAD',
        threadId: activeThreadId,
        body,
    });

    $('send-btn').disabled = false;
    $('send-btn').textContent = 'Send';

    if (res?.status === 201) {
        // Append new message to local data and re-render
        const thread = activityData.threads.find((t) => t.id === activeThreadId);
        if (thread) {
            thread.messages.push(res.body);
            thread.is_read = true;
            renderMessages(thread.messages);
        }
        $('reply-body').value = '';
    } else if (res?.status === 401) {
        $('reply-error').textContent = 'Token invalid — update in Settings.';
        $('reply-error').classList.remove('hidden');
    } else {
        $('reply-error').textContent = `Failed to send (${res?.status || 'network error'}). Try again.`;
        $('reply-error').classList.remove('hidden');
    }
});

// ── Navigation ────────────────────────────────────────────────────────────────
$('back-btn').addEventListener('click', () => {
    activeThreadId = null;
    showView('feed-view');
});

$('open-options')?.addEventListener('click', () => chrome.runtime.openOptionsPage());

$('refresh-btn').addEventListener('click', async () => {
    $('refresh-btn').textContent = '↻';
    const result = await chrome.runtime.sendMessage({ type: 'GET_ACTIVITY' });
    if (result?.ok && result.data) {
        activityData = result.data;
        $('fetch-error').classList.add('hidden');
        $('auth-error').classList.add('hidden');
        await renderFeed();
    } else if (result?.reason === 'unauthorized') {
        $('auth-error').classList.remove('hidden');
    } else {
        $('fetch-error').classList.remove('hidden');
    }
});

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
    const { token } = await chrome.storage.sync.get('token');
    if (!token) {
        showView('setup-view');
        return;
    }

    showView('feed-view');

    // Render from cache immediately
    const { activity, authError } = await chrome.storage.local.get(['activity', 'authError']);

    if (authError) {
        $('auth-error').classList.remove('hidden');
    }

    if (activity) {
        activityData = activity;
        await renderFeed();
    }

    // Background refresh
    const result = await chrome.runtime.sendMessage({ type: 'GET_ACTIVITY' });
    if (result?.ok && result.data) {
        activityData = result.data;
        $('fetch-error').classList.add('hidden');
        $('auth-error').classList.add('hidden');
        await renderFeed();
    } else if (result?.reason === 'unauthorized') {
        $('auth-error').classList.remove('hidden');
    } else if (!activity) {
        $('fetch-error').classList.remove('hidden');
    }
})();
