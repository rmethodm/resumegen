# Pre-Launch Feature Moat — Design Spec

**Date:** 2026-06-06
**Goal:** Build the feature moat required for a compelling Product Hunt / social media launch focused on generating signups.

---

## Overview

Four features ship together as a cohesive launch package:

1. **LinkedIn Import** — remove the #1 onboarding friction point
2. **Free Tier Expansion** — treat free as marketing spend; maximise top-of-funnel conversions
3. **Interview Prep Coach** — differentiating AI feature with strong shareability
4. **Organic Virality** — "Made with Resumegen" loop that converts visitors from shared resumes

---

## 1. LinkedIn Import

### Problem
Users arrive with their work history on LinkedIn. Asking them to re-type it creates immediate drop-off. The existing PDF import already uses `PdfResumeParser` — LinkedIn's PDF export fits that flow perfectly.

### User Flow
1. On the resume index page, user clicks "Import" → modal opens
2. Modal has two tabs: **PDF Resume** (existing) and **From LinkedIn** (new)
3. LinkedIn tab shows a 3-step instruction card:
   - Step 1: Go to LinkedIn → Me → Settings & Privacy → Data privacy → Get a copy of your data
   - Step 2: Select "Want something in particular?" → check Profile → Request archive
   - Step 3: Download the PDF from the email LinkedIn sends, then upload it here
4. Below the instructions: a file upload input (PDF only)
5. On upload, the existing `POST /builder/import` route handles it — no new backend route needed
6. On success, redirect to the new resume editor with a `linkedInImported: true` flash → green banner "Resume imported from LinkedIn"

### Backend Changes
- `PdfResumeParser` gets a `$hint` parameter (`'generic'` | `'linkedin'`) passed through from the controller
- When hint is `'linkedin'`, the Claude prompt uses a LinkedIn-specific variant that maps LinkedIn's headings to the resume JSON schema:
  - "Experience" → `experience[]`
  - "Education" → `education[]`
  - "Skills" → `skills[]`
  - "Certifications" → `certifications[]`
  - "Summary" / "About" → `contact.summary`
  - "Volunteer Experience" → ignored (no schema field)
- The hint is detected automatically from PDF content keywords ("LinkedIn" in header, "Connections", etc.) OR passed explicitly from the controller when user uploads via the LinkedIn tab
- Existing abuse filter, tier gate (free allowed), and resume limit check all still apply

### Frontend Changes
- `PdfImportModal.tsx` gains a `tab` prop defaulting to `'pdf'`; a second tab `'linkedin'` renders the instruction card + file input
- The instruction card is static, responsive, and uses numbered steps with icons
- `Index.tsx` passes `tab="linkedin"` when opening from a "From LinkedIn" shortcut button (optional second entry point)
- `Edit.tsx` checks `linkedInImported` flash prop and shows a teal banner (distinct from the existing `pdfImported` indigo banner)

### Acceptance Criteria
- LinkedIn PDF upload produces a populated resume with experience, education, and skills correctly mapped
- The `linkedInImported` banner appears on the editor after import
- Existing PDF import (generic tab) is unaffected
- Free users can import (no tier gate on import)

---

## 2. Free Tier Expansion

### Philosophy
Free is marketing spend. Every free user is a potential referral, a Product Hunt upvote, a tweet. The previous limits were optimised for conversion-to-paid before the product had organic traffic. Post-launch, generous free creates the word-of-mouth loop.

### Limit Changes

| Limit | Before | After | Rationale |
|---|---|---|---|
| Resumes | 2 | 5 | Let users experiment freely |
| Cover letters | 1 | 3 | One per active application |
| AI suggestions | 5 lifetime | 30/month | Enough to feel AI value without paying |
| Templates | classic, modern, ats | all 8 | Templates are a wow-factor demo feature |
| ATS score | Starter+ | 3/month free | Lets free users experience the feature |
| Interview coach | — | 3/month free | New feature; free taste drives upgrades |
| DOCX export | Starter+ | Starter+ | Kept as a paid differentiator |
| Job tailoring | Starter+ | Starter+ | Kept as a paid differentiator |

### Implementation
- All changes in `App\Services\UserLimits` constants only
- Monthly counts for ATS score and interview coach use `ai_usage_logs` filtered by `feature` and `created_at >= start of month`
- A new `UserLimits::canAtsScoreFree(User $user): bool` method checks the monthly count for free users; Starter+ always returns true
- A new `UserLimits::canInterviewCoach(User $user): bool` method follows the same pattern
- The `canAtsScore` prop currently passed to `Edit.tsx` is updated to reflect the new free allowance
- Upgrade modal copy updated: "You've used your 3 free ATS scores this month. Upgrade to Starter for unlimited scoring."

### Acceptance Criteria
- Free user can create 5 resumes, 3 cover letters, use all 8 templates
- Free user gets 30 AI suggestions per month (resets on calendar month boundary)
- Free user gets 3 ATS scores per month, then sees upgrade prompt
- Free user gets 3 interview coach uses per month, then sees upgrade prompt
- Starter+ users are unaffected by monthly caps

---

## 3. Interview Prep Coach

### Problem
Users have a resume but don't know what questions interviewers will ask, or how to answer them. This feature turns a static document into active interview preparation — a distinctly differentiating use case that Kickresume, Zety, and Resume.io don't offer.

### User Flow
1. In the resume editor, a "Interview Coach" button sits in the action bar alongside "ATS Score" and "Tailor to Job"
2. Clicking opens a slide-in panel from the right (same pattern as job tailor)
3. Panel has:
   - A "Target Role" text input (pre-filled from resume name if it contains a job title)
   - An optional "Job Description" textarea (max 3000 chars)
   - A "Generate Questions" button
4. After ~3–5 seconds, 8 interview questions appear, each with:
   - The question text
   - A STAR-framework hint: "Think about a specific time when you [verb phrase]…"
   - A "Copy" icon to copy the question + hint to clipboard
5. A "Regenerate" button fetches a new set
6. Free users see a counter: "3 of 3 free uses remaining this month"

### Backend

**New files:**
- `app/Services/InterviewCoachService.php`
- `app/Http/Controllers/InterviewCoachController.php`
- `tests/Feature/InterviewCoachTest.php`
- `tests/Unit/InterviewCoachServiceTest.php`

**Route:** `POST /builder/{resume}/interview-coach` — throttled `5,1` — named `builder.interview-coach`

**Request validation:**
- `target_role`: required, string, max 100
- `job_description`: nullable, string, max 3000

**Abuse filter:** `AbuseFilter::check()` applied to `target_role` and `job_description`

**Service prompt structure:**
```
You are an expert interview coach. Given the resume and target role below, generate 8 interview questions this candidate is likely to be asked, plus a STAR-framework coaching hint for each.

Target role: <user_content>{target_role}</user_content>

Resume summary:
- Name: {contact.name}
- Current/recent title: {most_recent_experience_title}
- Years of experience: {years_computed}
- Key skills: {skills joined, first 10}
- Experience highlights: {first 2 experience entries, title + company + bullet 1}

{if job_description}
Job description:
<user_content>{job_description}</user_content>
{/if}

Return a JSON array of 8 objects: { "question": "...", "hint": "Think about a specific time when you..." }
```

**Response:** `{ questions: [ { question: string, hint: string }, ... ] }` — capped at 8

**Usage logging:** `AiUsageLogger::log()` with `feature: 'interview_coach'`

**Tier gate:**
- Free: check monthly usage via `UserLimits::canInterviewCoach($user)` → 402 JSON `{ error, required_tier: 'starter' }` when exhausted
- Starter+: unlimited

**Props added to Edit.tsx:** `canInterviewCoach: bool` (whether user has remaining uses), `interviewCoachUsesRemaining: int|null` (null for Starter+)

### Frontend

**New file:** `resources/js/Pages/ResumeBuilder/Partials/InterviewCoachPanel.tsx`

**Pattern:** Mirrors `TailorPanel` layout — slide-in from right, backdrop div, close button with `aria-label="Close panel"`.

**State in Edit.tsx:**
- `showInterviewCoach: boolean`
- Pass `canInterviewCoach`, `interviewCoachUsesRemaining` as props into panel

**Locked state:** Free user who has exhausted uses → button calls `triggerUpgradeModal('interview_coach', 'starter')`

**TypeScript type** added to `resources/js/types/index.d.ts`:
```ts
export interface InterviewQuestion {
  question: string;
  hint: string;
}
```

### Acceptance Criteria
- 8 questions returned with STAR hints
- Free user blocked after 3 uses/month with upgrade modal
- Starter+ user has no limit
- Abuse filter blocks injection attempts
- Usage logged to `ai_usage_logs`
- Panel closes cleanly, no stale state on re-open
- `target_role` pre-filled from resume name when it contains a recognisable job title

---

## 4. Organic Virality ("Made with Resumegen")

### Problem
Every shared resume is a marketing impression that currently converts zero visitors. The public page (`/r/{token}`) shows a resume with no Resumegen branding, no signup CTA, and no reason for a visitor to do anything. This is wasted surface area.

### Three Pieces

#### 4a. Public Page — Sticky Footer CTA
- The existing `ResumeBuilder/PublicView.tsx` gains a sticky footer bar at the bottom of the viewport
- Content: `Made with Resumegen · Build your free resume →` (links to `/register`)
- Styling: subtle, doesn't cover resume content — semi-transparent white/light bar with a border-top
- Visible only to non-authenticated visitors (hide if `auth.user` exists)
- The `LinkExpired.tsx` page already redirects gracefully; no changes needed there

#### 4b. Public Page — Conversion Header
- A slim banner above the resume preview with the candidate's name (from `contact.name`) and a single CTA button: "Create your free resume →" linking to `/register`
- This gives visitors immediate context ("this is a resume for [Name]") and a conversion action before they scroll
- Hidden to authenticated users

#### 4c. Share Button in Editor
- A "Share" button added to the editor action bar (alongside ATS Score, Tailor, Interview Coach)
- Clicking opens a small popover (not a full modal) with:
  - The public resume URL (read-only text input)
  - "Copy link" button → copies URL to clipboard, button text changes to "Copied!" for 2s
  - "Share on LinkedIn" link → opens LinkedIn share dialog pre-filled with the URL
  - "Share on X" link → opens Twitter/X intent URL with "Check out my resume: {url}" pre-filled
- The share URL is the existing `route('resume.public', share_link.token)` — if no active share link exists, one is created automatically on button click
- If the resume has no active share link, the controller creates one; the popover URL updates after creation

### Backend Changes
- `ResumeBuilderController` gets a `shareUrl(Resume $resume)` action: returns `{ url }` JSON, auto-creating an active `ResumeShareLink` if none exists (same auto-create logic as existing `booted()` hook but exposed as an endpoint)
- Route: `GET /builder/{resume}/share-url` — named `builder.share-url`

### Frontend Changes
- `PublicView.tsx`: sticky footer + slim header CTA (both hidden for authenticated users)
- `Edit.tsx`: Share button + `SharePopover` inline component (small enough to inline, ~60 lines)

### Acceptance Criteria
- Public page shows sticky footer and header CTA to unauthenticated visitors
- Authenticated visitors (logged-in users viewing someone else's resume) do not see the CTAs
- Share button in editor copies URL to clipboard
- LinkedIn and X share links open with pre-filled text
- Auto-creating a share link on first Share button click works without a page refresh
- "Made with Resumegen" is not shown on PDF exports

---

## Error Handling & Edge Cases

| Scenario | Behaviour |
|---|---|
| LinkedIn PDF has no parseable text (scanned image) | Same as existing PDF import: 422 "Could not extract text from PDF" |
| Interview coach API key missing | 503 `{ message: 'AI service unavailable' }` |
| Interview coach returns malformed JSON | 503 `{ message: 'AI service unavailable' }` — AiUsageLogger called before guard |
| Free user hits monthly ATS limit | 402 JSON `{ error, required_tier: 'starter' }` from API; Inertia routes flash featureGate |
| Share URL auto-create fails (DB error) | 500 — surface error in popover: "Could not generate share link. Try again." |
| Resume has share link disabled | `shareUrl` endpoint re-enables it (or creates a new one) |

---

## Testing Strategy

- **Unit:** `InterviewCoachServiceTest` — correct prompt construction, JSON parse, throws on bad JSON, logs usage before guard
- **Feature:** `InterviewCoachTest` — free 402 after 3 uses, Starter unlimited, abuse filter, validation, ownership
- **Feature:** `FreeTierExpansionTest` — verifies new limits at each boundary (5 resumes, 3 cover letters, 30 AI/month, all templates, 3 ATS/month, 3 interview coach/month)
- **Feature:** `LinkedInImportTest` — LinkedIn hint produces correct field mapping, existing generic import unaffected
- **Feature:** `ShareUrlTest` — auto-creates share link, returns correct URL, disabled link gets re-enabled
- Existing test suite must remain at 100% pass rate throughout

---

## Out of Scope

- LinkedIn OAuth / LinkedIn API integration (user downloads PDF themselves)
- Formal referral tracking / reward system (replaced by organic virality)
- Salary insights, Chrome extension, QR codes (deferred post-launch)
- Landing page redesign (separate project)
