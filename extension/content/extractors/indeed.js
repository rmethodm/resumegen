// Indeed job extractor
// Extracts role, company, salary, and job description from Indeed job detail pages

function extractJob() {
    const role =
        document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"] span')?.textContent?.trim() ||
        document.querySelector('h1.jobsearch-JobInfoHeader-title')?.textContent?.trim() ||
        document.querySelector('h1[class*="jobTitle"]')?.textContent?.trim() ||
        '';
    const company =
        document.querySelector('[data-testid="inlineHeader-companyName"] a')?.textContent?.trim() ||
        document.querySelector('[data-testid="inlineHeader-companyName"]')?.textContent?.trim() ||
        document.querySelector('.jobsearch-InlineCompanyRating-companyHeader a')?.textContent?.trim() ||
        '';
    const salaryEl =
        document.querySelector('[data-testid="attribute_snippet_testid"]') ||
        document.querySelector('.metadata.salary-snippet-container') ||
        document.querySelector('[class*="salary"]');
    const salary = salaryEl?.textContent?.trim() || '';
    const jdEl = document.querySelector('#jobDescriptionText');
    const notes = jdEl ? jdEl.textContent.trim().slice(0, 500) : '';
    return { role, company, salary, notes, url: location.href };
}
