// Generic job extractor for any website
// Fallback: uses JSON-LD, OG tags, then page title

function extractJob() {
    function extractSalaryFromLd(item) {
        const base = item.baseSalary;
        if (!base) return '';
        const val = base.value;
        if (!val) return '';
        if (typeof val === 'number') return String(val);
        if (val.minValue && val.maxValue)
            return `${val.minValue}–${val.maxValue} ${base.currency || ''}`.trim();
        if (val.value) return `${val.value} ${base.currency || ''}`.trim();
        return '';
    }
    function splitTitle(title, siteName) {
        for (const sep of [' at ', ' - ', ' | ', ' — ', ' @ ']) {
            const idx = title.indexOf(sep);
            if (idx > 0) {
                return {
                    role: title.slice(0, idx).trim(),
                    company: title.slice(idx + sep.length).replace(siteName || '', '').trim(),
                };
            }
        }
        return { role: title.trim(), company: siteName || '' };
    }
    // 1. JSON-LD JobPosting
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const raw = JSON.parse(script.textContent);
            const items = Array.isArray(raw) ? raw : [raw];
            for (const item of items) {
                if (item['@type'] === 'JobPosting') {
                    return {
                        role: item.title || '',
                        company: item.hiringOrganization?.name || '',
                        salary: extractSalaryFromLd(item),
                        notes: item.description
                            ? item.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
                            : '',
                        url: location.href,
                    };
                }
            }
        } catch (_) {}
    }
    // 2. OG tags
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
    const ogSite = document.querySelector('meta[property="og:site_name"]')?.content || '';
    if (ogTitle) {
        const { role, company } = splitTitle(ogTitle, ogSite);
        return { role, company, salary: '', notes: '', url: location.href };
    }
    // 3. Page title fallback
    const { role, company } = splitTitle(document.title, '');
    return { role, company, salary: '', notes: '', url: location.href };
}
