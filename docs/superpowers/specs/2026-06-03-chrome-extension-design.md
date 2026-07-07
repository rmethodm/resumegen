# Chrome/Edge Extension — Job Saver
**Date:** 2026-06-03
**Status:** Approved

## Overview

A Manifest V3 browser extension for Chrome and Edge that lets users save job postings to the Resumegen job tracker with one click. The extension extracts structured fields (company, role, salary, job description) from the page, shows a review popup for editing, and POSTs to the existing Resumegen Sanctum API.

---

## Part 1 — Resumegen Web App Additions

### Token Management UI

A new "Browser Extension" section on the existing Profile/Settings page (`/profile`):

- Lists existing tokens: name, creation date, Revoke button
- "Generate Token" button → creates a token named `"Browser Extension"` → shows the plaintext token **once** in a modal with a copy button and a "won't be shown again" warning
- Instructional copy: "Paste this token into the Resumegen extension to connect your account"

### New API Routes

All three routes require `auth:sanctum` middleware and act on the authenticated user's tokens only.

| Method | Route | Action |
|--------|-------|--------|
| `GET` | `/api/user/tokens` | List tokens (id, name, created_at — never raw token) |
| `POST` | `/api/user/tokens` | Create token named "Browser Extension"; return plaintext token once |
| `DELETE` | `/api/user/tokens/{id}` | Revoke token |

Uses Sanctum's built-in `HasApiTokens` trait already present on the `User` model. No new auth infrastructure needed.

### New Controller

`App\Http\Controllers\Api\PersonalTokenController` with `index`, `store`, `destroy` methods.

---

## Part 2 — Extension

### Compatibility

Single codebase, Manifest V3. Works in Chrome and Edge (both Chromium). Publishable to the Chrome Web Store; Edge users can install from the Chrome Web Store or from a separate submission to the Microsoft Edge Add-ons store using the same package.

### File Structure

```
extension/
  manifest.json
  background/
    service-worker.js       # API calls, token reads from storage
  popup/
    popup.html
    popup.js
    popup.css
  content/
    extractors/
      linkedin.js
      indeed.js
      glassdoor.js
      greenhouse.js
      lever.js
      generic.js
  options/
    options.html
    options.js
  icons/
    16.png
    48.png
    128.png
```

### Permissions

```json
{
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": ["<all_urls>"]
}
```

`activeTab` + `scripting` allows running content scripts on demand when the popup opens. `storage` persists the API token via `chrome.storage.sync`. `host_permissions: <all_urls>` is required for the generic extractor to run on arbitrary job sites.

### Authentication

- User pastes their Resumegen API token into the options page
- Token stored in `chrome.storage.sync` (syncs across the user's Chrome/Edge devices)
- All API calls include `Authorization: Bearer {token}`
- Token never expires unless the user revokes it from the web app

First-time use (no token stored): popup shows a single prompt — "Paste your Resumegen API token to get started" with a link to the Profile page in the app.

---

## Part 3 — Extraction Strategy

Each known job board gets a dedicated content script that runs only on its matching URL pattern. Extraction priority for every extractor: **JSON-LD structured data first**, then **DOM selectors** as fallback.

| Board | URL match pattern | Primary method | Fields reliably available |
|-------|-------------------|----------------|---------------------------|
| LinkedIn | `*://www.linkedin.com/jobs/*` | DOM selectors | company, role, location, JD text |
| Indeed | `*://*.indeed.com/viewjob*` | DOM + meta tags | company, role, salary, JD text |
| Glassdoor | `*://www.glassdoor.com/job-listing/*` | JSON-LD + DOM | company, role, salary, JD text |
| Greenhouse | `*://boards.greenhouse.io/*` | JSON-LD (`JobPosting`) | company, role, JD text |
| Lever | `*://jobs.lever.co/*` | JSON-LD + DOM | company, role, location, JD text |
| Generic | `<all_urls>` | JSON-LD → OG tags → `<title>` | URL + title + best-effort |

**Generic extractor fallback chain:**
1. Parse `<script type="application/ld+json">` blocks for `@type: JobPosting` (catches Workday, Ashby, Rippling, and most modern company career pages)
2. Read Open Graph meta tags (`og:title`, `og:description`, `og:site_name`)
3. Split `<title>` on common separators (` at `, ` — `, ` | `) to guess role vs. company
4. Fall back to raw `document.title` as role, empty company

---

## Part 4 — Popup UX Flow

### Normal flow (token present)

1. User clicks extension icon on a job page
2. Popup opens → background service worker runs the appropriate content script for the current tab
3. Extracted data populates a compact review form:
   - **Role** — text input
   - **Company** — text input
   - **Salary** — text input (optional, pre-filled if found)
   - **URL** — read-only (always current page URL)
   - **Notes** — textarea, pre-filled with first ~500 chars of the JD text
   - **Status** — dropdown defaulting to `saved` (options match `JobApplication::STATUSES`: Saved, Applied, Interviewing, Offered, Rejected, Closed)
4. User edits as needed, clicks **Save Job**
5. Extension POSTs to `POST /api/jobs` with extracted + edited fields
6. **Success:** Green checkmark + "Saved! View in Resumegen →" link (opens job in new tab)

### Error states

| Condition | Message shown |
|-----------|---------------|
| No token stored | "Paste your Resumegen API token to get started [Open Settings]" |
| 401 Unauthorized | "Token invalid or revoked — update it in Settings" |
| 422 Validation error | Field-level error messages inline |
| Duplicate URL (409) | "You've already saved this job [View it →]" |
| Network error | "Couldn't reach Resumegen — check your connection" |

### Options page

- Single text input: "API Token"
- "Test Connection" button — calls `GET /api/auth/me`, shows the user's name on success
- Save button stores token to `chrome.storage.sync`

---

## Part 5 — Backend API Change for Duplicate Detection

Add a `409 Conflict` response to `POST /api/jobs` when a job with the same `job_url` already exists for the authenticated user. The extension uses this to show the "already saved" message rather than creating a duplicate.

---

## Out of Scope (v1)

- Resume association at save time (user can link a resume to the job later in the app)
- Salary data storage (no `salary` column on `job_applications` yet — notes field used instead if extracted)
- Firefox support (different extension API surface; add later)
- Auto-tailoring resume to the saved job description
