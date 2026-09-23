<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Job application test fixtures</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; max-width: 680px; margin: 48px auto; color: #1a1a2e; padding: 0 24px; }
  h1 { font-size: 18px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: #6b6b76; border-bottom: 1px solid #e2e2ea; padding-bottom: 6px; margin: 32px 0 12px; }
  ul { padding-left: 20px; }
  li { margin-bottom: 10px; }
  a { color: #002e5d; }
  p { color: #6b6b76; font-size: 13px; }
</style>
</head>
<body>
<h1>Job application test fixtures</h1>
<p>Local-only fake application pages for testing Resumegen Apply. Not registered outside the <code>local</code> environment.</p>

<h2>ATS-specific</h2>
<ul>
  <li><a href="{{ route('dev.job-fixtures.show', 'workday') }}">Workday-style</a> — data-automation-id, shadow-DOM phone field, ARIA combobox, hidden wizard steps</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'greenhouse') }}">Greenhouse-style</a> — bracketed field names, native select, EEO block trap</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'lever') }}">Lever-style</a> — single full-name field, contenteditable box, duplicate website fields</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'icims') }}">iCIMS-style</a> — same-origin iframe form, systemfield naming, cross-origin EEO frame</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'taleo') }}">Taleo-style</a> — opaque ffId_NNNNN field ids, label-only fallback</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'ashby') }}">Ashby-style</a> — _systemfield_name full-name field, resume[…] bracket family</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'smartrecruiters') }}">SmartRecruiters-style</a> — no dedicated ATS pattern (deferred); generic fallback test</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'custom') }}">Custom career page</a> — label-only matching, confirm-email trap, known heuristic gaps</li>
</ul>

<h2>Generic field-fill heuristics</h2>
<ul>
  <li><a href="{{ route('dev.job-fixtures.show', 'generic-autocomplete') }}">Autocomplete-only</a> — no name/id/label hints, autocomplete attributes only</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'generic-placeholder-only') }}">Placeholder-only</a> — no labels or names, placeholder text is the only signal</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'generic-bracketed-indexed') }}">Bracketed/indexed names</a> — applicant[0][first_name]-style array naming</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'generic-confirm-traps') }}">Confirm/verify traps</a> — confirm-email, verify-phone, secondary-email decoys</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'generic-hidden-wizard') }}">Hidden wizard (CSS)</a> — inactive step hidden via display:none, not [hidden]</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'generic-shadow-nested') }}">Nested shadow DOM</a> — fields two shadow-root levels deep</li>
</ul>

<h2>QA bank / free-text questions</h2>
<ul>
  <li><a href="{{ route('dev.job-fixtures.show', 'qa-open-ended') }}">Open-ended questions</a> — genuine screening questions, should all get a Draft affordance</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'qa-cover-letter-exclude') }}">Cover-letter exclusion</a> — cover-letter-shaped textareas must never get a Draft affordance</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'qa-short-label-exclude') }}">Short-label exclusion</a> — labels under 8 characters must never get a Draft affordance</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'qa-profile-match-exclude') }}">Profile-match exclusion</a> — Summary/Skills should autofill, not draft as a question</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'qa-resume-file-vs-coverletter-file') }}">Resume vs. cover-letter upload</a> — only the resume file input should be flagged</li>
</ul>

<h2>Job-app creation / JD import flow</h2>
<ul>
  <li><a href="{{ route('dev.job-fixtures.show', 'jd-jsonld-jobposting') }}">JSON-LD JobPosting</a> — structured job listing, mirrors Greenhouse board pages</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'jd-plain-html') }}">Plain-HTML listing</a> — no structured data, visible-text-only fallback</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'apply-landing') }}">Apply landing page</a> — no form; links to a separate real application page</li>
  <li><a href="{{ route('dev.job-fixtures.show', 'jd-multi-page-application') }}">Multi-step wizard (click-revealed)</a> — steps revealed via "Continue" clicks, not load-time</li>
</ul>
</body>
</html>
