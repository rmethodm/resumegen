# Security Scan — Resumegen

Stack: Laravel 13 / Inertia v3 / React 19 / Sanctum / DOMPDF / PHPWord.
Scan date: 2026-08-12. Read-only audit — no app files changed except the
already-committed `password.change` 2FA fix from earlier this session.

## Summary

The codebase is well-hardened: ownership checked on every resource route
(404-not-403), mass assignment locked via `#[Fillable]`/`$fillable` (2FA +
`is_admin` excluded), DOMPDF sandboxed, CORS closed, share tokens
`Str::random(40)`, share password `encrypted` + `hash_equals`, admin search
LIKE-escaped and parameterized. `composer audit` and `npm audit` both clean.
One real access-control gap (H1).

---

## HIGH

### H1 — Admin panel not gated by the 2FA challenge (2FA bypass on highest-value surface) — FIXED

- **Severity:** High
- **Location:** `routes/admin.php:13` group middleware `['auth','verified','admin']`.
  Contrast `routes/web.php:33` where `/dashboard` carries `two_factor_challenge`.
  Enforcement lives only in `app/Http/Middleware/RequiresTwoFactorChallenge.php`,
  applied per-route; `bootstrap/app.php` adds no global 2FA middleware.
- **Evidence** (`php artisan route:list`, verified live):
  - `users/{user}/disable` -> `web, Authenticate, EnsureEmailIsVerified, EnsureUserIsAdmin, throttle` — NO `RequiresTwoFactorChallenge`
  - `dashboard` -> `web, Authenticate, EnsureEmailIsVerified, RequiresTwoFactorChallenge`
  - `LoginResponse.php:15` sets `two_factor_auth_pending` and redirects to the
    challenge, but nothing enforces completion on admin routes.
- **Impact:** A 2FA-enabled admin is never challenged on the admin host. An
  attacker with only the admin password reaches the full admin panel:
  `UserController` disable/enable/revoke-tokens and `BackupController`
  **download / restore full DB backups** (`admin.backups.download`,
  `admin.backups.restore`). 2FA is defeated exactly where a breach is total.
- **Fix:**
  ```php
  // routes/admin.php
  Route::middleware(['auth', 'verified', 'two_factor_challenge', 'admin'])->group(...)
  ```
  Confirm the challenge page is reachable on the admin host (session is
  host-only); otherwise gate admin login so a pending session cannot use admin
  routes.
- **Suggested test:** acting as admin with
  `withSession(['two_factor_auth_pending' => true])`, `GET admin.users.index`
  -> assert redirect to 2FA challenge, not 200.

---

## LOW / Hardening

### L1 — Imported-job `url` stored without scheme allowlist, rendered as anchor href — FIXED

- **Location:** `app/Http/Requests/StoreImportedJobsRequest.php:31`
  (`'jobs.*.url' => ['nullable','string','max:2048']`); rendered at
  `resources/js/Pages/Jobs/Imports.tsx:358` `href={selectedJob.url}`.
- **Evidence:** No `url:http,https` rule (contrast `UpdateResumeRequest.php:83`
  `projects.*.url` which DOES use `url:http,https`). `CareerPageScraper.php:39`
  also takes `url` straight from third-party JSON-LD.
- **Impact:** A `javascript:` URL survives to the anchor. Mostly self-XSS
  (owner-only view), but a poisoned scrape source could make it stored-XSS on
  the resumegen origin for any user who saves + clicks that result.
- **Fix:** add `'url:http,https'` to the rule; drop non-http(s) scraped URLs.
- **Test:** save a job with `url = javascript:alert(1)` -> assert 422.

### L2 — Email OTP compared with `===` instead of `hash_equals` — FIXED

- **Location:** `app/Http/Controllers/Auth/TwoFactorChallengeController.php:73`
  (`$code === $cachedOtp`).
- **Impact:** Non-constant-time compare of a 6-digit OTP. Throttled 5/min —
  negligible; hardening only.
- **Fix:** `hash_equals((string) $cachedOtp, (string) $code)`.

### L3 — TOTP code replayable within its validity window — FIXED

- **Location:** `TwoFactorChallengeController.php:82` — `verifyKey` with no
  last-used-timestamp tracking.
- **Impact:** A sniffed TOTP is reusable ~30-90s. Throttled; low.
- **Fix:** use `verifyKeyNewer()` and persist the last accepted timestamp.

### L4 — Extension notes (by design; flag for store review, not bugs) — PARTIALLY FIXED

- `manifest.json:28` host_permissions `http://*/*` + `https://*/*` — inherent
  to "fill any ATS page" (activeTab-gated, user-initiated).
- `normalizeAppBase` (`extension/shared/app-base.js`) does not force HTTPS, so a
  user-set `http://` base would send the bearer PAT in cleartext.
- Token in `chrome.storage.sync` (standard). No change required; document the
  HTTPS expectation.

---

## Confirmed-clean (checked, no issue)

- **Ownership/IDOR:** every `Resume*`, `JobApplication`, `JobImports`,
  `ResumeShareLink`, note, snapshot, group, and both API controllers enforce
  `user_id === auth id` (404), incl. via FormRequest `authorize()`. API
  `me`/`resumes`/`fill-profile` also verify token ability
  (`extension`/`mobile`) and `disabled_at`.
- **Mass assignment:** `User` excludes `is_admin`/2FA fields; `ResumeShareLink`
  excludes `token`/`resume_id`; writes go through validated FormRequests.
- **SQLi:** admin search `addcslashes` + bound params (`UserController.php:23`);
  `like "%{$kw}%"` values are parameter-bound, not concatenated.
- **SSRF:** all outbound `Http::get` hosts hardcoded (Adzuna/USAJOBS/Greenhouse/
  Lever/OpenAI) or config-driven scrape sources (`config/job_scrape_sources`) —
  never request-controlled.
- **File paths:** `DatabaseBackupService::assertValidFilename` = `basename` +
  strict regex, doubled by route `->where(...)`; downloads from fixed private dir.
- **XSS:** only one `dangerouslySetInnerHTML` (`TwoFactorForm.tsx:81`) rendering
  a server-generated QR SVG from the user's own secret; no `{!! !!}` in Blade;
  DOMPDF `enable_php=false`, `enable_remote=false`, `chroot=base_path`.
- **Share links:** 40-char random token, `encrypted` password, `hash_equals`,
  unlock session key salted by password hash (rotating password revokes
  sessions), `throttle:share-unlock` (10/min per token+ip), expiry honored.
- **CSRF/CORS/rate-limits:** web CSRF default-on; CORS `allowed_origins: []`;
  login 5/min per email+ip, password-reset 6/min, 2FA challenge 5/min, token
  mint 10/min.
- **`password.change` 2FA gap** fixed earlier this session (patch applied, test
  green): `routes/auth.php` PUT `password` now has `two_factor_challenge`.

---

## Commands run

- `php artisan route:list --except-vendor` (94 routes) and `--path=… --json`
- `composer audit` -> No advisories
- `npm audit` / `npm audit --omit=dev` -> 0 vulnerabilities
- `php artisan test tests/Feature/Auth tests/Feature/Api` -> 61 passed
- `php artisan test tests/Feature/Auth/PasswordUpdateTest.php` -> 3 passed

## Commands blocked / not run

- Raw `grep`/`cat`/`find` blocked by dual-graph gate (used `fallback_rg`/
  `graph_read`).
- No live browser drive of the admin host (H1 confirmed statically via route
  middleware + `LoginResponse`/`bootstrap/app.php`).
- Did not run full suite or Dusk/Playwright E2E; did not modify app files.

## Coverage limits

- `.env`/production runtime values not inspected — findings assume
  `.env.example` prod guidance is followed (`SESSION_SECURE_COOKIE=true`,
  `APP_DEBUG=false`, `LOG_LEVEL=warning`, `DB_SSLMODE=require`). Re-check if any
  is unset in production.
- Extension content scripts (`fill.js`, `fill-heuristics.js`) reviewed only for
  injection surface, not full DOM-write behavior.
- No test exists for H1 (admin 2FA) or L1 (`job.url` scheme) — coverage gaps.

## Next recommended action

H1, L1, L2, L3, L4 all addressed. `manifest.json` host_permissions stay
`http://*/*`+`https://*/*` by design (needed to fill any ATS page). All
findings closed.

### Fixes applied (2026-08-12)

- `routes/admin.php` — group middleware now `['auth','verified',
  'two_factor_challenge','admin']`. Test:
  `tests/Feature/Admin/UserSupportTest.php::test_admin_with_pending_two_factor_challenge_cannot_access_admin_routes`.
- `app/Http/Requests/StoreImportedJobsRequest.php:31` — `jobs.*.url` now has
  `url:http,https`. Test:
  `tests/Feature/JobImportsTest.php::test_store_rejects_non_http_job_url`.
- `app/Http/Controllers/Auth/TwoFactorChallengeController.php` — email OTP
  compare now `hash_equals`; TOTP verify now `verifyKeyNewer()` with last-used
  timestamp cached per user (2 min) to block replay. Existing
  `TwoFactorChallengeTest` suite (43 auth tests) still green.
- `extension/shared/app-base.js` / `extension/options/options.js` — added
  `isInsecureRemoteUrl()`; options page now warns on save if the configured
  Resumegen URL is plaintext HTTP to a non-localhost host (token would leak
  in cleartext). host_permissions in `manifest.json` left as-is by design.
  Test: `extension/test/app-base.test.mjs` (`node --test`, 4 passed).
