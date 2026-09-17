# Extension Redesign — Sub-project 1: Sidepanel Foundation (React + shadcn)

Status: approved, ready for implementation plan
Date: 2026-09-17

## Context

This is sub-project 1 of a 5-part Chrome extension ("Resumegen Apply") redesign,
scoped after competitive research against Simplify Copilot (market leader,
500k+ users), Teal, and Huntr. Full sequence:

1. **Sidepanel foundation (this doc)** — React + shadcn rebuild of the existing UI
2. Autofill accuracy pass
3. Job clipper (LinkedIn, Indeed, Glassdoor, generic fallback)
4. Contact/recruiter CRM (reverses the 2026-08 `application_contacts` removal —
   explicit user decision, see below)
5. AI-powered keyword match scoring, credit-gated on existing AI credit ledger

Each sub-project gets its own spec → plan → implementation cycle. This doc
covers only #1.

### Decisions made during brainstorming

- Full competitive rebuild (not just a visual refresh) — add clipper, CRM,
  match scoring in later sub-projects.
- Sidepanel becomes a standalone React + Vite + shadcn app (Approach A of 3
  considered; see "Approaches considered" below).
- Never add auto-submit — extension fills, user always clicks Submit. This is
  a deliberate differentiator against competitors' complaint patterns
  (billing/refund disputes, templated AI, ToS-risk auto-apply agents).
- Keyword match scoring (sub-project 5) will be AI-powered and credit-gated,
  not the existing free deterministic diagnose engine — explicit user choice,
  overriding the initial recommendation to reuse the free engine.
- Contact/recruiter CRM (sub-project 4) explicitly reverses CLAUDE.md's
  documented "deliberately out of scope" status for `application_contacts`.
  This reversal must be noted in CLAUDE.md when sub-project 4 ships, same
  pattern as the 2026-09-09 billing reversal.

### Competitive research summary

- **Simplify Copilot** (leader): autofill (100+ ATS), tracker, job board, paid
  AI resume/cover-letter tailoring. Weaknesses found: enterprise ATS
  (Workday/Taleo) accuracy drops, AI output described as templated/unsophisticated,
  job board runs thin, opaque billing led to complaints, EU autofill breaks.
- **Teal**: strong job-clipper + keyword extraction, weak/no autofill depth.
- **Huntr**: job clipper + autofill + per-application contact/recruiter notes.
- **Resumegen's existing edge, currently unused in the extension**: a
  1.55M-row job listings dataset (`job_listings`/`job pool`), tailored-resume-
  per-application versioning tied to the Kanban tracker, and a QA bank — none
  of the three competitors above combine all three.

## Scope of this sub-project

Rebuild the sidepanel UI only. No new features, no new backend endpoints. Every
capability the current vanilla-JS sidepanel has must still work identically
after the rebuild:

- Connect/disconnect flow (token-based, `chrome.storage.sync`)
- Resume group/version selection
- Fill common fields (empty-only)
- Insert-into-focused-field chips (name, email, phone, LinkedIn, location,
  summary, skills, latest role, latest role bullets)
- Preview details toggle
- Scan for screening questions + review-before-insert drafts
- JD match badge (via right-click "Set as Resumegen job description")
- Track this application (save to job-applications tracker)
- Attach resume (find resume upload file inputs)
- Help view
- Settings/menu (refresh resumes, open Resumegen, settings, disconnect)

## Architecture & build

- New `extension/sidepanel-app/`: Vite + React 19 + TypeScript, own
  `package.json`, independent build from the main Inertia app.
- Build output goes to `extension/sidepanel/dist/`; `manifest.json`'s
  `side_panel.default_path` is updated to point at the built `index.html`.
- Copy in only the shadcn primitives actually needed for a ~360px panel:
  Button, Select, Tabs, Card, Badge, Input, Skeleton, Toast/Alert. Not a
  shared monorepo package with the main app (Approach B, rejected — see
  below) — copy the specific components plus the CSS-variable theme block
  from `resources/css/app.css`'s `@theme`, since the extension's component
  surface is much smaller than the Workstation's and the two will diverge.
- `background/service-worker.js`, `content/*.js`, and the existing
  message-passing contract (`chrome.tabs.sendMessage` /
  `chrome.runtime.onMessage`) are untouched. The React app is a drop-in
  replacement for `sidepanel.html` + `sidepanel.js` only.
- `node --test extension/test/*` keeps covering background/content-script
  logic (e.g. `heuristics.test.cjs`). New React code gets its own Vitest +
  React Testing Library setup, colocated per component.

### Approaches considered

**A — Standalone React+Vite+shadcn app (chosen).** Own build inside
`extension/`, copies needed shadcn components + theme tokens. Isolated, low
setup cost, matches existing message-passing contract untouched.

**B — Shared monorepo UI package.** A `packages/ui` workspace package used by
both the main Inertia app and the extension. Rejected: real "one source of
truth" benefit, but the extension's UI surface is much smaller than the
Workstation's, and the setup cost (workspace config, versioning, path
aliases) isn't justified yet. Revisit only if the two surfaces' component
needs converge later.

**C — React + hand-rolled Tailwind, no shadcn.** Rejected: throws away the
token/theme system already built for the main app and reinvents component
primitives, contradicting the explicit decision to use shadcn.

## Views & navigation

State machine (`setup → loading → empty → ready → help`) becomes a single
`view` state variable with conditional rendering — no react-router, 5 screens
don't need a routing library.

The `ready` view's current sub-sections become independent components so
later sub-projects can extend or replace one without touching the rest:

- `FillPanel` (resume/version select, fill common fields)
- `InsertChips` (insert-into-focused-field chips + latest role bullets)
- `ScreeningQuestions` (scan + draft review)
- `JdMatchBadge` (show match badge on page)
- `TrackApplication` (save to tracker form)
- `AttachResume` (find resume upload file inputs)

One layout change beyond a pure port: the `ready` view's 6 sections get a
top-level tab strip (`Fill | Track | Help`) instead of one long scroll, since
it's now visibly holding 7 sections worth of content. Not a new feature —
same content, grouped for navigability.

## Data flow

- `useConnection()` hook reads `chrome.storage.sync` (token, app URL) on
  mount — same storage keys as today, so existing installs don't need to
  reconnect after the rebuild.
- `fetchExtensionApi()` wrapper (fetch + bearer token + base URL) replaces
  today's inline fetch calls to `/api/extension/*` — same endpoints, same
  response shapes, just typed via TypeScript interfaces.
- Content-script interaction (fill, scan questions, JD badge, file-input
  detection) stays message-passing exactly as today:
  `chrome.tabs.sendMessage(tabId, {type: 'FILL_COMMON'})` etc. Content
  scripts (`content/fill.js`, `content/jd-badge.js`) are not modified.
- State (resumes, selected version, questions, connection status) lives in
  component state and a couple of small hooks — no Redux/Zustand; the
  surface is too small to need a state library.

## Error handling

Three failure classes, ported from the existing vanilla-JS behavior — no new
error states introduced:

1. **Auth failure** (401/token revoked) → back to `setup` view with the
   existing "reconnect, your token may have been revoked" copy.
2. **Network/API error** → inline banner in the current view (today's
   `#banner` pattern becomes a `<Toast>`/alert component); never a blank
   screen.
3. **Content-script unreachable** (cross-origin iframe, no active tab) →
   same "can't reach this page" messaging the fill/scan buttons already
   show.

## Testing

- Vitest + React Testing Library, colocated per component
  (`FillPanel.test.tsx` etc.).
- Cover: view transitions (setup→ready on connect, ready→setup on auth
  failure), each panel's render against mocked API responses, and
  message-passing calls (assert correct `chrome.tabs.sendMessage` payload
  per action) — mock `chrome.*` the same way `extension/test/heuristics.test.cjs`
  already does.
- No backend changes in this sub-project, so no `php artisan test` changes
  expected.
- Manual acceptance check before calling this done: build the React app,
  load unpacked in Chrome, run through all 5 ATS fixture pages at
  `/dev/job-fixtures` (Workday, Greenhouse, Lever, iCIMS, hand-built) that
  the current extension already passes — per project verification policy,
  a clean build and passing unit tests are not sufficient on their own.

## Out of scope (this sub-project)

- Job clipper, contact CRM, AI match scoring — sub-projects 3, 4, 5.
- Any change to `background/service-worker.js`, `content/*.js`, or backend
  API endpoints.
- Auto-submit of any kind — explicitly and permanently out of scope for the
  whole redesign, not just this sub-project.
