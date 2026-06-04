// Greenhouse job extractor
// Uses JSON-LD (always published by Greenhouse) with DOM fallback

function extractJob() {
    // Greenhouse always publishes JSON-LD
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const data = JSON.parse(script.textContent);
            if (data['@type'] === 'JobPosting') {
                const company =
                    data.hiringOrganization?.name ||
                    document.querySelector('.company-name')?.textContent?.trim() ||
                    '';
                return {
                    role: data.title || '',
                    company,
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
    const role = document.querySelector('h1.app-title, h1[class*="app-title"]')?.textContent?.trim() || '';
    const company = document.querySelector('.company-name')?.textContent?.trim() || '';
    return { role, company, salary: '', notes: '', url: location.href };
}
