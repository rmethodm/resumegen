// Extractor functions — must be self-contained (no imports, no closure references)
function extractGeneric() {
    function extractSalaryFromLd(item) {
        const base = item.baseSalary;
        if (!base) return '';
        const val = base.value;
        if (!val) return '';
        if (typeof val === 'number') return String(val);
        if (val.minValue && val.maxValue) return `${val.minValue}–${val.maxValue} ${base.currency || ''}`.trim();
        if (val.value) return `${val.value} ${base.currency || ''}`.trim();
        return '';
    }
    function splitTitle(title, siteName) {
        for (const sep of [' at ', ' - ', ' | ', ' — ', ' @ ']) {
            const idx = title.indexOf(sep);
            if (idx > 0) return { role: title.slice(0, idx).trim(), company: title.slice(idx + sep.length).replace(siteName || '', '').trim() };
        }
        return { role: title.trim(), company: siteName || '' };
    }
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const raw = JSON.parse(script.textContent);
            const items = Array.isArray(raw) ? raw : [raw];
            for (const item of items) {
                if (item['@type'] === 'JobPosting') {
                    return { role: item.title || '', company: item.hiringOrganization?.name || '', salary: extractSalaryFromLd(item), notes: item.description ? item.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) : '', url: location.href };
                }
            }
        } catch (_) {}
    }
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
    const ogSite = document.querySelector('meta[property="og:site_name"]')?.content || '';
    if (ogTitle) { const { role, company } = splitTitle(ogTitle, ogSite); return { role, company, salary: '', notes: '', url: location.href }; }
    const { role, company } = splitTitle(document.title, '');
    return { role, company, salary: '', notes: '', url: location.href };
}

function extractLinkedIn() {
    const role = document.querySelector('h1.top-card-layout__title')?.textContent?.trim() || document.querySelector('h1[class*="job-details-jobs-unified-top-card__job-title"]')?.textContent?.trim() || document.querySelector('h1.t-24')?.textContent?.trim() || '';
    const company = document.querySelector('.topcard__org-name-link')?.textContent?.trim() || document.querySelector('[class*="job-details-jobs-unified-top-card__company-name"] a')?.textContent?.trim() || document.querySelector('.jobs-unified-top-card__company-name a')?.textContent?.trim() || '';
    const jdEl = document.querySelector('.description__text') || document.querySelector('#job-details') || document.querySelector('[class*="jobs-description-content__text"]');
    const notes = jdEl ? jdEl.textContent.trim().slice(0, 500) : '';
    return { role, company, salary: '', notes, url: location.href };
}

function extractIndeed() {
    const role = document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"] span')?.textContent?.trim() || document.querySelector('h1.jobsearch-JobInfoHeader-title')?.textContent?.trim() || document.querySelector('h1[class*="jobTitle"]')?.textContent?.trim() || '';
    const company = document.querySelector('[data-testid="inlineHeader-companyName"] a')?.textContent?.trim() || document.querySelector('[data-testid="inlineHeader-companyName"]')?.textContent?.trim() || '';
    const salaryEl = document.querySelector('[data-testid="attribute_snippet_testid"]') || document.querySelector('.metadata.salary-snippet-container');
    const salary = salaryEl?.textContent?.trim() || '';
    const jdEl = document.querySelector('#jobDescriptionText');
    const notes = jdEl ? jdEl.textContent.trim().slice(0, 500) : '';
    return { role, company, salary, notes, url: location.href };
}

function extractGlassdoor() {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const data = JSON.parse(script.textContent);
            if (data['@type'] === 'JobPosting') return { role: data.title || '', company: data.hiringOrganization?.name || '', salary: '', notes: data.description ? data.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) : '', url: location.href };
        } catch (_) {}
    }
    const role = document.querySelector('[data-test="job-title"]')?.textContent?.trim() || document.querySelector('h1[class*="JobTitle"]')?.textContent?.trim() || '';
    const company = document.querySelector('[data-test="employer-name"]')?.textContent?.trim() || '';
    return { role, company, salary: '', notes: '', url: location.href };
}

function extractGreenhouse() {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const data = JSON.parse(script.textContent);
            if (data['@type'] === 'JobPosting') return { role: data.title || '', company: data.hiringOrganization?.name || document.querySelector('.company-name')?.textContent?.trim() || '', salary: '', notes: data.description ? data.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) : '', url: location.href };
        } catch (_) {}
    }
    const role = document.querySelector('h1.app-title')?.textContent?.trim() || '';
    const company = document.querySelector('.company-name')?.textContent?.trim() || '';
    return { role, company, salary: '', notes: '', url: location.href };
}

function extractLever() {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const data = JSON.parse(script.textContent);
            if (data['@type'] === 'JobPosting') return { role: data.title || '', company: data.hiringOrganization?.name || '', salary: '', notes: data.description ? data.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) : '', url: location.href };
        } catch (_) {}
    }
    const role = document.querySelector('.posting-headline h2')?.textContent?.trim() || '';
    const company = document.querySelector('.main-header-logo img')?.getAttribute('alt')?.trim() || (document.title.includes(' at ') ? document.title.split(' at ').pop()?.trim() : '') || '';
    return { role, company, salary: '', notes: '', url: location.href };
}

function pickExtractor(url) {
    if (url.includes('linkedin.com/jobs')) return extractLinkedIn;
    if (/indeed\.com/.test(url) && url.includes('viewjob')) return extractIndeed;
    if (url.includes('glassdoor.com')) return extractGlassdoor;
    if (url.includes('boards.greenhouse.io')) return extractGreenhouse;
    if (url.includes('jobs.lever.co')) return extractLever;
    return extractGeneric;
}

const $ = id => document.getElementById(id);
function showView(id) {
    for (const el of document.querySelectorAll('.view')) el.classList.add('hidden');
    $(id).classList.remove('hidden');
}
function showError(msg) {
    const el = $('error-msg');
    el.textContent = msg;
    el.classList.remove('hidden');
}
function hideError() { $('error-msg').classList.add('hidden'); }

(async () => {
    const { token } = await chrome.storage.sync.get('token');
    if (!token) { showView('setup-view'); return; }
    showView('form-view');
    $('extracting-label').classList.remove('hidden');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    $('job-url').value = tab.url || '';
    try {
        const fn = pickExtractor(tab.url || '');
        const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: fn });
        const data = results?.[0]?.result;
        if (data) {
            $('role').value = data.role || '';
            $('company').value = data.company || '';
            $('salary').value = data.salary || '';
            $('notes').value = data.notes || '';
            $('job-url').value = data.url || tab.url || '';
        }
    } catch (_) {}
    $('extracting-label').classList.add('hidden');
})();

$('open-options')?.addEventListener('click', () => chrome.runtime.openOptionsPage());

$('save-btn').addEventListener('click', async () => {
    hideError();
    const payload = {
        company: $('company').value.trim(),
        role: $('role').value.trim(),
        status: $('status').value,
        job_url: $('job-url').value.trim() || null,
        notes: $('notes').value.trim() || null,
    };
    const salary = $('salary').value.trim();
    if (salary) payload.notes = `Salary: ${salary}\n\n${payload.notes || ''}`.trim();
    if (!payload.company && !payload.role) { showError('Enter at least a company or role.'); return; }
    $('save-btn').disabled = true;
    $('save-btn').textContent = 'Saving…';
    const res = await chrome.runtime.sendMessage({ type: 'SAVE_JOB', data: payload });
    $('save-btn').disabled = false;
    $('save-btn').textContent = 'Save Job';
    if (res.status === 201) {
        const jobId = res.body?.id;
        const { apiBase } = await chrome.storage.sync.get('apiBase');
        const base = (apiBase || 'https://resumegen.app').replace(/\/api$/, '').replace(/\/$/, '');
        $('view-link').href = jobId ? `${base}/jobs/${jobId}` : `${base}/jobs`;
        showView('success-view');
    } else if (res.status === 409) {
        showError("You've already saved this job.");
    } else if (res.status === 401) {
        showError('Token invalid or revoked — update it in Settings.');
    } else if (res.status === 0) {
        showError("Couldn't reach Resumegen — check your connection.");
    } else {
        showError(`Error ${res.status} — try again.`);
    }
});
