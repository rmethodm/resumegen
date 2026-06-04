// Glassdoor job extractor
// Tries JSON-LD first, falls back to DOM selectors

function extractJob() {
    // JSON-LD first (Glassdoor often includes it)
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
    const role =
        document.querySelector('[data-test="job-title"]')?.textContent?.trim() ||
        document.querySelector('h1[class*="JobTitle"]')?.textContent?.trim() ||
        '';
    const company =
        document.querySelector('[data-test="employer-name"]')?.textContent?.trim() ||
        document.querySelector('[class*="EmployerProfile"] span')?.textContent?.trim() ||
        '';
    return { role, company, salary: '', notes: '', url: location.href };
}
