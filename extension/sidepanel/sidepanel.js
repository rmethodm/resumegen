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

const FIELD_LABELS = {
    first_name: 'First name', last_name: 'Last name', email: 'Email', phone: 'Phone',
    linkedin: 'LinkedIn', website: 'Website', location: 'Location', school: 'School',
    degree: 'Degree', summary: 'Summary', current_title: 'Current title',
    current_company: 'Current company', target_role: 'Target role', skills: 'Skills', full_name: 'Full name',
};

let state = {
    groups: [],
    user: null,
    selectedGroupId: null,
    selectedResumeId: null,
    profile: null,
    previewOpen: false,
    previousView: 'ready',
    scan: null,
    selectedKeys: [],
    focusContext: null,
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

const SETUP_COPY = {
    unauthorized: {
        headline: 'Reconnect Resumegen',
        body: "Your connection token no longer works — it may have been revoked or replaced. Generate a new one on Profile, then paste it in Settings.",
    },
    default: {
        headline: 'Connect your Resumegen account',
        body: 'Pull contact details and experience from your resumes into job forms. Nothing is submitted for you.',
    },
};

function showSetup(reason) {
    const copy = SETUP_COPY[reason] || SETUP_COPY.default;
    $('setup-headline').textContent = copy.headline;
    $('setup-body').textContent = copy.body;
    showView('setup');
}

// ── Messaging ─────────────────────────────────────────────────────────────────

function send(type, payload = {}) {
    return chrome.runtime.sendMessage({ type, ...payload });
}

// ── Load ──────────────────────────────────────────────────────────────────────

async function init() {
    const config = await send('GET_CONFIG');
    if (!config?.token) {
        showSetup();
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
            showSetup(result.reason);
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
            showSetup('unauthorized');
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

function renderScan() {
    const scan = state.scan;
    const panel = $('review-panel');
    if (!scan) {
        panel.classList.add('hidden');
        $('scan-count').textContent = 'Not scanned';
        $('scan-title').textContent = 'Scan this page for safe matches';
        $('scan-helper').textContent = 'We’ll look for recognizable empty fields. You review the matches before anything is entered.';
        return;
    }

    const matches = scan.matches || [];
    const fillable = matches.filter((item) => item.matched && item.empty);
    const selected = new Set(state.selectedKeys);
    $('scan-count').textContent = `${fillable.length} ready`;
    $('scan-title').textContent = fillable.length ? 'Review before filling' : 'Nothing ready to fill';
    $('scan-helper').textContent = scan.crossOriginFrames
        ? `${scan.crossOriginFrames} embedded frame${scan.crossOriginFrames === 1 ? '' : 's'} couldn’t be reached.`
        : 'Only empty fields are eligible. Existing values stay untouched.';
    $('review-summary').textContent = `${selected.size} selected · ${fillable.length} empty matches found`;
    $('review-list').innerHTML = fillable.map((item) => {
        const strong = item.score >= 70;
        return `<label class="review-row ${strong ? '' : 'needs-review'}">
          <input type="checkbox" data-review-key="${esc(item.key)}" ${selected.has(item.key) ? 'checked' : ''}>
          <span class="review-main"><strong>${esc(FIELD_LABELS[item.key] || item.key)}</strong><small>${esc(item.fieldLabel || 'Recognized field')}</small></span>
          <span class="match-score">${strong ? 'Strong match' : 'Review'}</span>
        </label>`;
    }).join('') || '<p class="review-empty">No recognizable empty fields found on this page.</p>';
    panel.classList.toggle('hidden', fillable.length === 0);
}

function renderFocusAssistant() {
    const context = state.focusContext;
    const text = $('focus-context');
    const chips = [...document.querySelectorAll('#insert-chips [data-insert]')];
    if (!context?.ok) {
        text.textContent = context?.message || 'Click a field on the application, then refresh suggestions.';
        chips.forEach((chip) => chip.classList.remove('recommended'));
        return;
    }

    const ranked = new Map((context.suggestions || []).map((item) => [item.key, item.score]));
    text.textContent = `Focused field: ${context.fieldLabel}. Most relevant suggestions are first.`;
    chips.sort((a, b) => (ranked.get(b.dataset.insert) || 0) - (ranked.get(a.dataset.insert) || 0));
    chips.forEach((chip) => {
        chip.classList.toggle('recommended', ranked.has(chip.dataset.insert));
        $('insert-chips').appendChild(chip);
    });
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
        send('OPEN_APP', { path: `/resumes/${p.resume_id}/workstation` });
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
    if (state.scan && state.selectedKeys.length === 0) {
        setBanner('Select at least one field to fill.', 'warn');
        return;
    }

    const btn = $('fill-btn');
    btn.disabled = true;
    btn.textContent = 'Filling…';

    const result = await send('FILL_COMMON_FIELDS', { profile: state.profile, selectedKeys: state.selectedKeys });

    btn.disabled = false;
    btn.textContent = 'Fill selected fields';

    if (!result?.ok) {
        setBanner(result?.message || 'No fillable fields found on this page', 'warn');
        $('fill-helper').textContent = 'Open the application form, then try again. Or use Insert below.';
        return;
    }

    const kind = result.filled > 0 ? 'success' : 'warn';
    setBanner(result.message || `Filled ${result.filled || 0} fields`, kind);
    $('fill-helper').textContent = 'Review the form before you submit.';
}

async function onScan() {
    if (!state.profile) {
        setBanner('Select a resume first.', 'warn');
        return;
    }
    const btn = $('scan-btn');
    btn.disabled = true;
    btn.textContent = 'Scanning…';
    const result = await send('SCAN_PAGE', { profile: state.profile });
    btn.disabled = false;
    btn.textContent = 'Scan again';
    if (!result?.ok) {
        setBanner(result?.message || 'Could not scan this page.', 'error');
        return;
    }
    state.scan = result;
    state.selectedKeys = (result.matches || [])
        .filter((item) => item.matched && item.empty)
        .map((item) => item.key);
    renderScan();
    setBanner('Review the matches before filling.', 'success');
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

async function refreshFocusAssistant() {
    if (!state.profile) {
        return;
    }
    const btn = $('refresh-focus-btn');
    btn.disabled = true;
    btn.textContent = 'Reading…';
    state.focusContext = await send('GET_FOCUS_CONTEXT', { profile: state.profile });
    btn.disabled = false;
    btn.textContent = 'Refresh';
    renderFocusAssistant();
}

// ── Events ────────────────────────────────────────────────────────────────────

$('connect-btn').addEventListener('click', () => {
    send('OPEN_APP', { path: '/profile' });
});

$('open-options-setup').addEventListener('click', () => chrome.runtime.openOptionsPage());
$('create-resume-btn').addEventListener('click', () => send('OPEN_APP', { path: '/dashboard' }));
$('refresh-empty-btn').addEventListener('click', () => loadResumes());
$('fill-btn').addEventListener('click', onFill);
$('scan-btn').addEventListener('click', onScan);
$('refresh-focus-btn').addEventListener('click', refreshFocusAssistant);
$('review-clear').addEventListener('click', () => {
    state.selectedKeys = [];
    renderScan();
});
$('review-list').addEventListener('change', (e) => {
    const key = e.target.dataset.reviewKey;
    if (!key) return;
    const selected = new Set(state.selectedKeys);
    e.target.checked ? selected.add(key) : selected.delete(key);
    state.selectedKeys = [...selected];
    renderScan();
});
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
    state.scan = null;
    state.selectedKeys = [];
    state.focusContext = null;
    renderScan();
    renderFocusAssistant();
    await loadProfile();
});

$('version-select').addEventListener('change', async (e) => {
    state.selectedResumeId = Number(e.target.value) || e.target.value;
    await chrome.storage.local.set({ selectedResumeId: state.selectedResumeId });
    setBanner('');
    state.scan = null;
    state.selectedKeys = [];
    state.focusContext = null;
    renderScan();
    renderFocusAssistant();
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
                scan: null,
                selectedKeys: [],
                focusContext: null,
            };
            showSetup();
        }
    }
});

init();
