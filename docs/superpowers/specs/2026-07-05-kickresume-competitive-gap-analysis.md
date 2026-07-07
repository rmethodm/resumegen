# Kickresume Competitive Gap Analysis

Date: 2026-07-05
Status: Reference notes (not a design spec)

## Purpose

Deep scan of kickresume.com to compare against this app's feature set and identify
possible upgrades to stay competitive.

## Kickresume feature summary

- Resume Builder — 40+ ATS-friendly templates, 1M+ design combinations
- Cover Letter Builder — 40+ templates
- AI Resume Writer / AI Cover Letter Writer — GPT-4.1 powered
- AI Resignation Letter Generator
- Resume Checker — instant feedback, scored against a database of successful resumes
- ATS Resume Checker — keyword/format optimization
- Human resume proofreading (paid add-on)
- AI Resume Rewriter, Translator, Bullet Point Generator
- Personal website builder — 7 templates, all tiers
- Career Map — AI-suggested career paths from resume content
- AI Career Coach
- Interview Questions Generator
- LinkedIn & PDF import
- 1,500+ resume/cover-letter examples library
- Native iOS/Android apps
- Pricing: Free (4 templates, 1 site template, unlimited downloads) / Yearly $6.40/mo / Quarterly $14.40/mo / Monthly $19.20/mo — all paid tiers get everything (no feature-gated tiers beyond free vs. paid)

Sources: kickresume.com/en/, kickresume.com/en/pricing/, kickresume.com/en/ai-cover-letter-writer/

## Gap analysis vs. this app

**Already covered by this app (as of 2026-07-05, verified in code):**
- Resume scoring — `AtsScorer` (GPT-powered ATS score, `2026-06-02-gpt-ats-score-design.md`). Note: the Job-Match Scorer (`2026-07-01-job-match-scorer-design.md`) is only a spec, not implemented — no `job_match` code exists anywhere in the app.
- Interview Questions Generator — `InterviewCoachController`, tier-gated
- Personal website builder — `PortfolioController` + `Portfolio/Show.tsx` + `/p/{slug}` routes, per `2026-06-08-public-portfolio-page-design.md`, fully implemented (verified 2026-07-05: controller, page, and routes all exist)

**Confirmed net-new gaps (not built):**
1. AI Resignation Letter Generator — spec written: `2026-07-05-resignation-letter-generator-design.md`
2. LinkedIn import (auto-populate resume from LinkedIn/PDF export)
3. Career Map (AI-suggested career paths) — spec written: `2026-07-05-career-map-design.md`.
   AI Career Coach (multi-turn chat) — spec written: `2026-07-05-ai-career-coach-design.md`.
4. Resume translator — spec written: `2026-07-05-resume-translator-design.md`. Note: the
   "rewriter" half of this gap already exists (`rewrite_bullet`).
5. Human proofreading upsell (ops workflow, not just code)
6. Native mobile apps (separate platform effort)

**This app's edge over Kickresume (keep/promote, don't copy their model):**
- Built-in job-application tracker (CRM-style) — Kickresume has no equivalent
- Agency/team workspace tier
- Admin analytics/ops tooling

## Next steps

Brainstorm and design gap items one at a time, starting with whichever has the best
effort/impact ratio. Designed so far: Resignation Letter Generator, Career Map, Resume
Translator, AI Career Coach. Remaining: LinkedIn import, human proofreading upsell (ops),
native mobile apps (platform effort, not a single feature).
