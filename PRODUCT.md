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

Non-AI product surfaces (templates, PDF/DOCX export, resume editing, share links, Kanban) are not tier-gated. Generative AI requires an active **$9.95/mo** Cashier subscription plus AI credits (starter pack on first subscribe; Buy credits stub until Stripe pack price is configured). Do not invent extra paid tiers, locked templates, or unlimited-AI marketing without asking (see CLAUDE.md "Billing — subscription + AI credits").

Secondarily, Resumegen goes beyond "just a builder": job-application tracking and a browser extension for autofilling applications make it an end-to-end apply workflow, not a one-time document generator.

## Operating Context

- Builder: relational per-section editor (`Workstation.tsx`) with 24 resume templates, autosave, live preview, versioning/compare.
- Applying: Job Application Kanban tracker (`/job-applications`) and a live job-import search (Adzuna/USAJOBS).
- Sharing: token-based public share links with optional email/password gates and expiry, for sending a resume to a recruiter or checking who viewed it.
- Browser extension: autofills job-application forms on external ATS pages using data from a Resumegen resume.
- AI is credit-gated on the Workstation: bullet/summary rewrite and Optimize generate-for-gap return 2–3 options and debit the ledger after success; Optimize diagnose (keyword overlap) stays free. No chat Coach. See CLAUDE.md "AI — subscription credit gates".

## Capabilities and Constraints

- Billing: $9.95/mo subscription + AI credit ledger. Upgrade/Buy CTAs belong only on generative-AI empty states (not subscribed / out of credits), not as a global paywall over the builder.
- AI UI must show cost, disabled + Buy when out of credits, and Accept/Discard for options — never silent-overwrite user text. Coach/chat stays out of scope unless explicitly requested.
- No public resume gallery/portfolio feature currently exists.
- Support admin exists on a separate domain (`admin.resumegen.test`) but is out of scope for user-facing design work.

## Brand Commitments

- Name: **Resumegen** (product name is one word, capital R).
- Existing marketing site (`Welcome.tsx`) uses a purple gradient identity (`#5952d2` → `#4a44b8`), Tailwind v3, Headless UI + Heroicons — not shadcn/Radix. Existing headline voice: direct, outcome-first ("Land more interviews with a standout resume").

## Product Principles

- Core builder/export/share stays usable without implying multi-tier lockouts; paid messaging is for the $9.95 plan and AI credits only.
- Speed and low friction for the multi-application job seeker; structure and guidance for the first-time/career-change resume builder — designs should serve both without forcing a persona choice.
- The product is an apply workflow, not just a document generator — builder, tracker, and extension should feel like one system, not three bolted-together tools.
- ATS-compatibility is a functional constraint on the resume templates themselves (server-rendered PDF), not just a marketing claim.

