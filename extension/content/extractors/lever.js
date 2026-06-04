// Lever job extractor
// Uses JSON-LD (published by Lever) with DOM fallback

function extractJob() {
    // Lever publishes JSON-LD
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const data = JSON.parse(script.textContent);
            if (data['@type'] === 'JobPosting') {
                return {
                    role: data.title || '',
                    company: data.hiringOrganization?.name || '',
                    salary: '',
                    notes: data.description
                        ? data.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
                        : '',
                    url: location.href,
                };
            }
        } catch (_) {}
    }
    // DOM fallback
    const role = document.querySelector('.posting-headline h2')?.textContent?.trim() || '';
    const companyFromTitle = document.title.includes(' at ')
        ? document.title.split(' at ').pop()?.trim() || ''
        : '';
    const company =
        document.querySelector('.main-header-logo img')?.getAttribute('alt')?.trim() ||
        companyFromTitle;
    return { role, company, salary: '', notes: '', url: location.href };
}
