# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two primary audiences, both served by the same builder:

- **Active job seekers** applying to multiple companies at once — want to move fast, avoid ATS rejection, and keep applications organized without losing track of what they sent where.
- **Career changers and early-career job seekers** building their first serious resume or pivoting fields — need more structure and guidance, not just speed.

## Product Purpose

Resumegen helps people build a polished, ATS-friendly resume and get through the whole apply cycle: build the resume, track where they've applied (Kanban: Saved/Applied/Interviewing/Offer/Rejected), and (via a companion browser extension) autofill job-application forms with their resume data. Success is landing more interviews.

## Positioning

Free and unlimited, with no paywall anywhere — every template, PDF/DOCX export, resume, and share link is unlimited at zero cost. Most competitor resume builders (Zety, Novoresume, Rezi, etc.) gate templates, exports, or resume count behind a paid tier. This is a confirmed, durable product decision (see CLAUDE.md "Billing — there is none") — do not design in upgrade CTAs, paywalls, tier badges, or locked-template treatments.

Secondarily, Resumegen goes beyond "just a builder": job-application tracking and a browser extension for autofilling applications make it an end-to-end apply workflow, not a one-time document generator.

## Operating Context

- Builder: relational per-section editor (`Workstation.tsx`) with 24 resume templates, autosave, live preview, versioning/compare.
- Applying: Job Application Kanban tracker (`/job-applications`) and a live job-import search (Adzuna/USAJOBS).
- Sharing: token-based public share links with optional email/password gates and expiry, for sending a resume to a recruiter or checking who viewed it.
- Browser extension: autofills job-application forms on external ATS pages using data from a Resumegen resume.
- AI is narrow and opt-in: bullet rewrite and summary generation only, disabled by default (`AI_ENABLED`), edit-in-place with no auto-save. Not a chat assistant, not a full resume generator.

## Capabilities and Constraints

- No billing, tiers, or metering of any kind — every feature is free and unlimited. Do not introduce paywall, upgrade, or locked-feature UI without asking first.
- No AI beyond the Tier-1 bullet-rewrite/summary slice; expanding AI is a product decision, not a design default.
- No public resume gallery/portfolio feature currently exists.
- Support admin exists on a separate domain (`admin.resumegen.test`) but is out of scope for user-facing design work.

## Brand Commitments

- Name: **Resumegen** (product name is one word, capital R).
- Existing marketing site (`Welcome.tsx`) uses a purple gradient identity (`#5952d2` → `#4a44b8`), Tailwind v3, Headless UI + Heroicons — not shadcn/Radix. Existing headline voice: direct, outcome-first ("Land more interviews with a standout resume").

## Product Principles

- Free and unlimited is a selling point, not an implementation detail — never let a design imply a paid tier exists.
- Speed and low friction for the multi-application job seeker; structure and guidance for the first-time/career-change resume builder — designs should serve both without forcing a persona choice.
- The product is an apply workflow, not just a document generator — builder, tracker, and extension should feel like one system, not three bolted-together tools.
- ATS-compatibility is a functional constraint on the resume templates themselves (server-rendered PDF), not just a marketing claim.

