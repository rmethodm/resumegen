// LinkedIn job extractor
// Extracts role, company, and job description from LinkedIn job detail pages

function extractJob() {
    const role =
        document.querySelector('h1.top-card-layout__title')?.textContent?.trim() ||
        document.querySelector('h1[class*="job-details-jobs-unified-top-card__job-title"]')?.textContent?.trim() ||
        document.querySelector('h1.t-24')?.textContent?.trim() ||
        '';
    const company =
        document.querySelector('.topcard__org-name-link')?.textContent?.trim() ||
        document.querySelector('[class*="job-details-jobs-unified-top-card__company-name"] a')?.textContent?.trim() ||
        document.querySelector('.jobs-unified-top-card__company-name a')?.textContent?.trim() ||
        '';
    const jdEl =
        document.querySelector('.description__text') ||
        document.querySelector('#job-details') ||
        document.querySelector('[class*="jobs-description-content__text"]');
    const notes = jdEl ? jdEl.textContent.trim().slice(0, 500) : '';
    return { role, company, salary: '', notes, url: location.href };
}
