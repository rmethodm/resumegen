const $ = (id) => document.getElementById(id);

const INSERT_LABELS = {
    full_name: 'Full name',
    email: 'Email',
    phone: 'Phone',
    linkedin: 'LinkedIn',
    location: 'Location',
    summary: 'Summary',
    skills: 'Skills',
    latest_role: 'Latest role',
    latest_role_bullets: 'Latest role bullets',
};

let state = {
    groups: [],
    user: null,
    selectedGroupId: null,
    selectedResumeId: null,
    profile: null,
    previewOpen: false,
    previousView: 'ready',
};

// ── Views ─────────────────────────────────────────────────────────────────────

function showView(id) {
    for (const el of document.querySelectorAll('.view')) {
        el.classList.add('hidden');
    }
    const view = $(`view-${id}`);
    if (view) {
        view.classList.remove('hidden');
    }
}

function setBanner(text, kind = 'success') {
    const banner = $('banner');
    if (!text) {
        banner.classList.add('hidden');
        banner.textContent = '';
        return;
    }
    banner.textContent = text;
    banner.className = `banner ${kind}`;
}

function closeMenu() {
    $('menu').classList.add('hidden');
}

// ── Messaging ─────────────────────────────────────────────────────────────────

function send(type, payload = {}) {
    return chrome.runtime.sendMessage({ type, ...payload });
}

// ── Load ──────────────────────────────────────────────────────────────────────

async function init() {
    const config = await send('GET_CONFIG');
    if (!config?.token) {
        showView('setup');
        return;
    }
    await loadResumes();
}

async function loadResumes() {
    showView('loading');
    setBanner('');

    const result = await send('FETCH_RESUMES');

    if (!result?.ok) {
        if (result?.reason === 'no_token' || result?.reason === 'unauthorized') {
            showView('setup');
            return;
        }
        showView('ready');
        setBanner("Couldn't load resume data. Check your connection and try again.", 'error');
        return;
    }

    state.groups = result.data.groups || [];
    state.user = result.data.user || null;

    const emailBit = state.user?.email ? ` · ${state.user.email}` : '';
    $('empty-email').textContent = emailBit;
    $('ready-email').textContent = emailBit;

    if (state.groups.length === 0) {
        showView('empty');
        return;
    }

    await restoreSelection();
    renderPickers();
    await loadProfile();
    showView('ready');
}

function groupKey(groupOrId) {
    if (groupOrId && typeof groupOrId === 'object') {
        return groupOrId.id == null ? '0' : String(groupOrId.id);
    }
    return groupOrId == null || groupOrId === '' ? '0' : String(groupOrId);
}

async function restoreSelection() {
    const stored = await chrome.storage.local.get(['selectedGroupId', 'selectedResumeId']);
    let groupId = stored.selectedGroupId;
    let resumeId = stored.selectedResumeId;

    const group = state.groups.find((g) => groupKey(g) === groupKey(groupId)) || state.groups[0];
    state.selectedGroupId = group?.id ?? null;

    const versions = group?.versions || [];
    const version = versions.find((v) => String(v.id) === String(resumeId)) || versions[0];
    state.selectedResumeId = version?.id ?? null;

    await chrome.storage.local.set({
        selectedGroupId: state.selectedGroupId,
        selectedResumeId: state.selectedResumeId,
    });
}

function renderPickers() {
    const groupSelect = $('group-select');
    const versionSelect = $('version-select');
    groupSelect.innerHTML = '';
    versionSelect.innerHTML = '';

    for (const group of state.groups) {
        const opt = document.createElement('option');
        opt.value = groupKey(group);
        opt.textContent = group.title || 'Untitled resume';
        if (groupKey(group) === groupKey(state.selectedGroupId)) {
            opt.selected = true;
        }
        groupSelect.appendChild(opt);
    }

    const group = currentGroup();
    for (const version of group?.versions || []) {
        const opt = document.createElement('option');
        opt.value = version.id;
        const when = relativeTime(version.updated_at);
        opt.textContent = `${version.version_label || 'v?'} · Updated ${when}`;
        if (String(version.id) === String(state.selectedResumeId)) {
            opt.selected = true;
        }
        versionSelect.appendChild(opt);
    }
}

function currentGroup() {
    return state.groups.find((g) => groupKey(g) === groupKey(state.selectedGroupId)) || state.groups[0];
}

function currentVersion() {
    const group = currentGroup();
    return (group?.versions || []).find((v) => String(v.id) === String(state.selectedResumeId))
        || group?.versions?.[0];
}

async function loadProfile() {
    const version = currentVersion();
    if (!version) {
        state.profile = null;
        renderMeta();
        return;
    }

    const result = await send('FETCH_FILL_PROFILE', { resumeId: version.id });
    if (!result?.ok) {
        if (result?.reason === 'unauthorized') {
            showView('setup');
            return;
        }
        setBanner("Couldn't load resume data. Check your connection and try again.", 'error');
        state.profile = null;
        renderMeta();
        return;
    }

    state.profile = result.data;
    state.selectedResumeId = result.data.resume_id;
    await chrome.storage.local.set({ selectedResumeId: state.selectedResumeId });
    renderMeta();
    renderPreview();
}

function renderMeta() {
    const p = state.profile;
    if (!p) {
        $('meta-line').textContent = '';
        $('contact-line').textContent = '';
        return;
    }
    const role = p.target_role || p.latest_role?.title || '';
    $('meta-line').textContent = [p.contact?.full_name, role].filter(Boolean).join(' · ');
    $('contact-line').textContent = [
        p.contact?.email,
        p.contact?.phone,
        p.contact?.location,
    ].filter(Boolean).join(' · ');
}

function renderPreview() {
    const p = state.profile;
    const el = $('preview');
    if (!p) {
        el.innerHTML = '';
        return;
    }

    const c = p.contact || {};
    const bullets = (p.latest_role?.bullets || []).slice(0, 3)
        .map((b) => `• ${esc(b)}`)
        .join('<br>');
    const more = (p.latest_role?.bullets || []).length > 3
        ? `<br>+${p.latest_role.bullets.length - 3} more`
        : '';

    el.innerHTML = `
      <h3>Contact</h3>
      <p>${esc(c.full_name)}<br>${esc(c.email)}<br>${esc(c.phone)}<br>${esc(c.location)}<br>${esc(c.linkedin)}</p>
      <h3>Summary</h3>
      <p>${esc(clamp(p.summary || '—', 280))}</p>
      <h3>Latest role</h3>
      <p>${esc(p.latest_role?.one_liner || '—')}<br>${bullets}${more}</p>
      <h3>Skills</h3>
      <p>${esc(p.skills_csv || '—')}</p>
      <button type="button" id="edit-resume-link" class="btn-link">Edit in Resumegen</button>
    `;

    $('edit-resume-link')?.addEventListener('click', () => {
        send('OPEN_APP', { path: `/resumes/${p.resume_id}/builder` });
    });
}

function clamp(str, n) {
    if (str.length <= n) {
        return str;
    }
    return `${str.slice(0, n)}…`;
}

function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function relativeTime(iso) {
    if (!iso) {
        return 'recently';
    }
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (Number.isNaN(diff)) {
        return 'recently';
    }
    if (diff < 60) {
        return 'just now';
    }
    if (diff < 3600) {
        return `${Math.floor(diff / 60)}m ago`;
    }
    if (diff < 86400) {
        return `${Math.floor(diff / 3600)}h ago`;
    }
    if (diff < 86400 * 14) {
        return `${Math.floor(diff / 86400)}d ago`;
    }
    return new Date(iso).toLocaleDateString();
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function onFill() {
    if (!state.profile) {
        setBanner('Select a resume first.', 'warn');
        return;
    }

    const btn = $('fill-btn');
    btn.disabled = true;
    btn.textContent = 'Filling…';

    const result = await send('FILL_COMMON_FIELDS', { profile: state.profile });

    btn.disabled = false;
    btn.textContent = 'Fill common fields';

    if (!result?.ok) {
        setBanner(result?.message || 'No fillable fields found on this page', 'warn');
        $('fill-helper').textContent = 'Open the application form, then try again. Or use Insert below.';
        return;
    }

    const kind = result.filled > 0 ? 'success' : 'warn';
    setBanner(result.message || `Filled ${result.filled || 0} fields`, kind);
    $('fill-helper').textContent = 'Review the form before you submit.';
}

async function onInsert(key) {
    const label = INSERT_LABELS[key] || key;
    const text = state.profile?.inserts?.[key] || '';

    if (!text) {
        setBanner(`No ${label} on this resume. Add it in Resumegen.`, 'warn');
        return;
    }

    const result = await send('INSERT_FOCUSED', { text, label });
    if (!result?.ok) {
        setBanner(result?.message || 'Click a text field on the page first, then insert.', 'warn');
        return;
    }
    setBanner(result.message || `Inserted ${label} into the focused field.`, 'success');
}

// ── Events ────────────────────────────────────────────────────────────────────

$('connect-btn').addEventListener('click', () => {
    send('OPEN_APP', { path: '/profile' });
});

$('open-options-setup').addEventListener('click', () => chrome.runtime.openOptionsPage());
$('create-resume-btn').addEventListener('click', () => send('OPEN_APP', { path: '/dashboard' }));
$('refresh-empty-btn').addEventListener('click', () => loadResumes());
$('fill-btn').addEventListener('click', onFill);
$('footer-open').addEventListener('click', () => send('OPEN_APP', { path: '/dashboard' }));
$('footer-help').addEventListener('click', () => {
    state.previousView = $('view-ready').classList.contains('hidden') ? 'setup' : 'ready';
    if (!$('view-empty').classList.contains('hidden')) {
        state.previousView = 'empty';
    }
    showView('help');
});
$('help-back').addEventListener('click', () => showView(state.previousView || 'ready'));

$('group-select').addEventListener('change', async (e) => {
    const key = e.target.value;
    state.selectedGroupId = key === '0' ? null : Number(key);
    const group = currentGroup();
    state.selectedResumeId = group?.versions?.[0]?.id ?? null;
    await chrome.storage.local.set({
        selectedGroupId: state.selectedGroupId,
        selectedResumeId: state.selectedResumeId,
    });
    renderPickers();
    setBanner('');
    await loadProfile();
});

$('version-select').addEventListener('change', async (e) => {
    state.selectedResumeId = Number(e.target.value) || e.target.value;
    await chrome.storage.local.set({ selectedResumeId: state.selectedResumeId });
    setBanner('');
    await loadProfile();
});

$('preview-toggle').addEventListener('click', () => {
    state.previewOpen = !state.previewOpen;
    $('preview').classList.toggle('hidden', !state.previewOpen);
    $('preview-toggle').textContent = state.previewOpen ? '▾ Hide preview' : '▸ Preview details';
});

document.getElementById('insert-chips').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-insert]');
    if (!btn) {
        return;
    }
    onInsert(btn.dataset.insert);
});

$('insert-bullets-btn').addEventListener('click', () => onInsert('latest_role_bullets'));

$('menu-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    $('menu').classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('#menu') && !e.target.closest('#menu-btn')) {
        closeMenu();
    }
});

$('menu').addEventListener('click', async (e) => {
    const item = e.target.closest('[data-action]');
    if (!item) {
        return;
    }
    const action = item.dataset.action;
    closeMenu();

    if (action === 'refresh') {
        await loadResumes();
    } else if (action === 'open-app') {
        send('OPEN_APP', { path: '/dashboard' });
    } else if (action === 'options') {
        chrome.runtime.openOptionsPage();
    } else if (action === 'disconnect') {
        if (confirm('Disconnect this browser? You can connect again anytime.')) {
            await send('DISCONNECT');
            state = {
                groups: [],
                user: null,
                selectedGroupId: null,
                selectedResumeId: null,
                profile: null,
                previewOpen: false,
                previousView: 'ready',
            };
            showView('setup');
        }
    }
});

init();
