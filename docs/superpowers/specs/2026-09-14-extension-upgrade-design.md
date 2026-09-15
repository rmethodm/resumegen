# Resumegen Apply extension — upgrade design

**Status:** Approved, not started
**Date:** 2026-09-14
**Owner decision context:** competitive research (Simplify, Teal, LazyApply, JobWizard, OwlApply) plus direct product requests during brainstorming.

## Why

The extension (`extension/`, MV3, v2.4.1) fills empty form fields from a Resumegen resume and never auto-submits. That's solid but thin next to competitors, who add: AI-drafted answers to screening questions, broader ATS coverage, one-click job tracking, inline JD-match scoring, and resume-file auto-attach. Two competitor patterns are deliberately excluded here because they collide with locked product decisions:

- **Auto-apply / bulk-submit volume applying** — already parked as `docs/UNFORGET.md` P4, blocked on user decision. Not part of this spec. Teal's own team has publicly warned that auto-apply floods the pipeline with unqualified applications and lowers response rates — reinforces why P4 stays parked.
- **Full cover-letter generation** — removed from the product outright on 2026-08-18. This spec's AI-answer feature has a hard boundary against it (see Phase A).

Also explicitly out of scope: auto-opening the side panel without a click. Chrome does not allow `sidePanel.open()` outside a genuine user gesture (confirmed against Chrome's own extension docs and current open issues) — there is no programmatic bypass, so this was dropped as infeasible rather than deferred.

## Phases

Each phase ships independently and gets its own implementation plan (same model as the 2026-09-14 JobNavigator Tier-1 spec). Priority order below; phases after A can reorder relative to each other without re-approval.

### Phase A — AI screening-question answers (highest priority)

**What:** the side panel detects free-text questions on the current form and can draft an answer for the user to review and insert — never auto-fills without that click.

**Backend — new endpoint:** `POST /api/extension/qa-bank/draft`, `extension` ability.
- Request: `{ question: string, resume_id: int }`.
- **Match-first:** runs the existing `App\Support\QaBankMatcher` against the user's `QaBankEntry` rows. A good match returns immediately, tagged `source: 'qa_bank'`, no credit spent.
- **AI fallback:** no good match → gated by the same rule as every other generative surface — `subscribed('default')` AND balance ≥ cost AND NOT `ai_blocked` — then debits `ai_credit_ledger` on success. 402 if not subscribed/insufficient credits, 429 if `ai_blocked` (existing convention, see `CLAUDE.md` "AI — subscription credit gates").
- Response: `{ answer: string, source: 'qa_bank' | 'ai', cost: int | null }`.

**Cover-letter boundary (hard rule):** the content-script detector that finds candidate question fields explicitly excludes any field whose label or nearby text matches a cover-letter heuristic (case-insensitive substring match against a small list: "cover letter", "letter of interest", "why this letter", etc.). Excluded fields get no "Draft" affordance at all — this is a detection-time exclusion, not a UI-level hide, so it can't be bypassed by the user clicking through.

**Detection:** content script scores free-text fields with an associated question label, reusing the label-proximity scoring approach already in `content/fill-heuristics.js`. It sends the list of detected questions to the side panel (not drafted inline on the page) so the review step happens in the panel's existing insert-chip UI pattern.

**Flow:** side panel lists detected questions → user clicks "Draft" on one → drafted text appears in a preview → user clicks to insert into the page field via the existing insert mechanism. After a successful AI draft, an opt-in "Save to your Q&A bank" prompt appears so future forms match for free.

**Credit UX:** side panel shows remaining balance and the per-draft cost inline; the Draft button disables with a "Buy credits" link when insufficient — matches the existing Workstation convention (never silent-fail).

**Testing:** extension-side unit tests (`extension/test/`) for field detection and the cover-letter exclusion regex; backend feature tests mirroring `AiUsageLimiterTest` patterns (subscribed+credits happy path, not-subscribed 402, out-of-credits 402, `ai_blocked` 429, qa-bank-match-skips-AI-spend path).

### Phase B — Tracker tie-in

**What:** one-click "Save to tracker" in the side panel creates a `JobApplication` row (status `Saved`) from the current page.

**Backend — new endpoint:** `POST /api/extension/job-applications`, `extension` ability. Body: `{ company, title, url, ...detected fields }`.

**Detection:** company/title heuristics reuse the same scoring style as existing field detection where possible (page title, og:meta tags, common ATS header patterns) — not a new detection system.

**Confirmation:** side panel shows what it detected before saving (company/title/URL), never saves silently — if detection is wrong the user can edit inline before confirming.

**Testing:** backend feature test for the new endpoint (creates row, respects `user_id` ownership, rejects malformed payloads); extension-side test for the detection heuristic.

### Phase C — Connect-flow polish

**What:** replace paste-token-into-Settings with one-click connect.

**Mechanism:** extension opens a new Resumegen tab at a dedicated connect route (new, e.g. `GET /extension/connect`) while already authenticated in that browser session; that page mints an extension-ability Sanctum token server-side and hands it back to the extension via the extension messaging bridge (`chrome.runtime.sendMessage` from the page, using `externally_connectable` in the manifest scoped to the app's own origin) — no copy/paste, no token ever rendered as visible plaintext on the page.

**Fallback:** the existing paste-token Settings flow stays as-is for cases where messaging isn't available (e.g. the web page opened in a different browser than the one running the extension).

**Testing:** extension-side test for the messaging handshake; backend feature test for the new connect route (requires auth, issues a token scoped to the `extension` ability only).

### Phase D — JD import + inline match badge

**What:** two features that share the `target_job_description` field, so they ship together.

1. **JD import via context menu:** right-click selected text on any page → "Set as Resumegen job description" (`chrome.contextMenus`, `contexts: ['selection']`). Sends the selection plus the currently-selected resume id to a new endpoint `PATCH /api/extension/resumes/{id}/target-job-description`, `extension` ability. Side panel shows a confirmation toast after the update.
2. **Inline match badge:** content script detects a job-description-shaped block of text on the page (heuristic: large text block near job-posting-pattern URLs/headings) and shows a small badge with a match score. The score comes from a **client-side port of the existing deterministic keyword-overlap logic** (the same algorithm behind Optimize diagnose / `jdKeywordOverlap` on the frontend) — no AI, no network round trip, no new cost. Badge recalculates immediately after a JD import from (1).

**Manifest change:** add `contextMenus` to `permissions`.

**Testing:** extension-side unit tests for the ported overlap function (should match the existing `resources/js/lib` implementation's output on the same fixtures); backend feature test for the new PATCH endpoint (ownership check, length limits matching the existing `target_job_description` column constraints).

### Phase E — Wider ATS coverage

**What:** add Lever, iCIMS, and Taleo field-scoring patterns to `content/fill-heuristics.js`, alongside the existing Greenhouse/Workday/Ashby support. SmartRecruiters/Avature are explicitly deferred, not part of this phase.

**Testing:** new cases in `extension/test/heuristics.test.cjs` per platform, following the existing per-platform test structure. Manual QA against the fake application pages at `/dev/job-fixtures` (local-only) — add fixture pages for the three new platforms if none exist yet.

### Phase F — PDF auto-attach

**What:** content script detects file-upload inputs (heuristic: `type="file"`, label/accept-attribute matching resume/CV keywords) and offers to auto-attach the resume PDF.

**Mechanism:** fetches the PDF via the existing authenticated download route (same one used for manual download today), constructs a `File` object from the blob, sets it on the detected input via `DataTransfer` (the standard technique for programmatically populating a file input).

**User control:** this is an explicit action (a button next to the detected input, e.g. "Attach resume PDF"), not automatic — consistent with the "empty-only, user reviews everything" principle already governing the rest of the extension.

**Known risk:** file-input security behavior varies by site (some block `DataTransfer`-set files, some require a real user-initiated `change` event which `DataTransfer` does correctly trigger, some sanitize/reject programmatically-set files entirely). Treat as best-effort — if the site rejects it, fall back to today's manual download/upload with a clear message, don't silently fail.

**Testing:** manual QA against `/dev/job-fixtures` plus at least one real ATS of each covered type; no reliable automated test for file-input DOM behavior across sites, so this phase leans on manual verification more than the others.

## Cross-cutting rules (apply to every phase)

- **Never auto-submit.** Unchanged from the existing product principle.
- **Never silently overwrite.** Every insert/attach/save is a reviewable action or shows a clear confirmation before/after.
- **AI cost transparency.** Any generative call shows cost and remaining balance before spending; disables with a Buy link when insufficient credits.
- **No cover-letter generation**, even through a large free-text field (Phase A boundary).
- **No auto-apply / bulk submission** — not part of this spec, stays parked as P4.
- **`extension` ability stays scoped** — no new endpoint should grant more than the specific action it needs (mirrors the existing `mobile` vs `extension` ability separation in `CLAUDE.md`'s API Layer section).

## Out of scope (explicitly)

- Auto-opening the side panel without a click — infeasible in Chrome MV3, not deferred, dropped.
- Full cover-letter generation — stays removed.
- Auto-apply / volume submission — stays parked as P4, blocked on user decision.
- SmartRecruiters, Avature, and other lower-usage ATS platforms — candidates for a later phase, not this spec.

## Sequencing note

Phase A ships first (highest competitive value, reuses the just-shipped Q&A bank). Phases B–F can be reordered relative to each other based on what's cheapest to land next, without needing to re-open this spec.
