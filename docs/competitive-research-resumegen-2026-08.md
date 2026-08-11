# Competitive research — Resumegen (2026-08)

> Status: **Partial**. Grounded in repo/product code, project pricing docs, and competitor vendor pages as scanned. No live side-by-side account QA. Re-verify competitor prices before any public pricing launch.
>
> Related: `docs/pricing-recommendations-2026-08.md`, `docs/resume-builder-competitive-analysis.md`, `docs/ai-reintroduction-map.md`, `docs/competitive-pricing-one-pager-2026-08.md`.

---

## Executive summary

Resumegen is a free, unlimited end-to-end apply workflow—resume builder with PDF/DOCX export and share, dashboard self-scoring, Job Application Kanban, Adzuna/USAJOBS job imports, and a Sanctum-backed Chrome/Edge autofill extension—not a one-shot document generator.

Against peers, it **matches or leads** on ungated multi-format export and free use, **matches** on in-app Kanban stages, and is **closest to Rezi** on form autofill. It **lags specialists** on JD-ATS scoring, one-click job-board clipping, and broad AI (cover letters, writers, Auto Apply).

For today’s thinner surface: **stay free** or add a **cheap single paid layer** (~$9/mo, ~$59–72/yr, or a $49–59 ~90-day search pack)—**not** $19–29/mo until an AI-volume or ATS-scan wedge exists.

---

## What Resumegen is

| Surface | What ships |
|--------|------------|
| Builder | Templates, editor, PDF/DOCX, share links |
| Dashboard | Deterministic self-score (profile / experience / impact / role-keyword bands) |
| Tracker | Kanban: Saved → Applied → Interviewing → Offer → Rejected |
| Jobs | Live Adzuna / USAJOBS search + per-user save; optional AI match |
| Extension | **Resumegen Apply** — MV3 side-panel; empty-only form fill from Sanctum fill-profile |

**Policy:** free and unlimited core. No billing, plan tiers, or metering of templates, resumes, PDF/DOCX, or share links.

**AI (optional):** bullet rewrite, summary, job match/tailoring only. Off unless `AI_ENABLED` and an OpenAI key are set. Soft monthly free-taste caps when on: **5 / 2 / 5** (rewrites / summaries / job matches). Gap analysis and cover-letter drafting remain frontend stubs.

**Deliberately out of scope or removed:** cover/resignation letters, proofreading, portfolio/public gallery, A/B variants, salary hints, Career Hub/Filament admin extras, mobile app, extension auto-submit/iframe apply, job-application contacts/interview notes.

---

## Closest peers

| Tier | Products | Why |
|------|----------|-----|
| **True peers** (builder + tracking and/or browser tooling + ATS/match) | **Teal**, **Jobscan**, **Rezi** | Multi-workflow job-search OS shape |
| **Builder peers** | Kickresume, Reactive Resume | Strong builders; weaker apply-pipeline tooling |
| **Download/paywall builders** | Zety, Resume.io | Builder-led; not full job-search OS peers |

---

## Same or better

| Strength | Comparison |
|----------|------------|
| **Ungated free multi-format export** | Unlimited free PDF + DOCX matches Teal free, Jobscan free builder download, Reactive Resume, Kickresume free downloads—and **leads** gated builders (Zety free TXT-only; Rezi free 1 resume / 3 PDFs). |
| **Free unlimited core product** | No paywall on templates, resumes, export, or share vs download-gated SaaS builders. |
| **In-app Kanban tracking** | Stage model aligns with peer trackers. |
| **Form autofill extension** | Empty-only ATS fill is closer to Rezi’s autofill + pipeline than to tracker-first extensions. |
| **Integrated apply cycle** | Builder + track + import + extension is the same multi-surface shape as the strongest peers—not a single-purpose exporter. |

---

## Where peers are stronger (or partial match)

| Gap | Who leads | Resumegen position |
|-----|-----------|--------------------|
| **ATS / job-match scoring** | Jobscan (resume-vs-JD); Rezi (ATS checkpoints); Kickresume ATS checker | Core score is deterministic self-score that “knows nothing about any job posting” unless optional AI match is on |
| **Board clipping** | Teal, Jobscan (one-click save from many boards) | Does not lead |
| **AI breadth** | Teal, Kickresume, Rezi, Jobscan (cover letters, full writers, interview tools, Auto Apply) | Optional rewrite/summary/match only; AI off by default with soft quotas |
| **Shipped completeness of apply tools** | Peers with letters + Auto Apply | Cover letters and gap analysis still stubs; many letter/proofreading/portfolio surfaces removed by design |

---

## Competitor pricing (US list, as scanned)

| Product | Free tier | Paid entry (list) |
|--------|-----------|-------------------|
| **Resumegen** | Unlimited core; no billing/tiers | None in production |
| **Teal** | Unlimited resumes + PDF/DOC; gates AI credits (10/2/2), 10 templates, top-5 keywords, basic analysis | Teal+ $13/7d, $29/30d, or $79/90d |
| **Resume.io** | 1 resume/cover; TXT only | $2.95 7-day trial → $29.95 every 4 weeks; $49.95 quarterly |
| **Kickresume** | Download with free customization only | ~$24/mo monthly, $18/mo quarterly, $8/mo yearly ($96/yr); sale pricing sometimes lower |
| **Rezi** | 1 resume, 3 PDFs, DOCX free, standard templates | Pro $29/mo unlimited; Lifetime $149 one-time (no monthly expert review) |
| **Resume Genius** | Resume TXT only; cover letters PDF/Word/TXT free | $2.95 14-day trial → $23.95 every 4 weeks; annual $7.95/mo ($95.40/yr) |
| **Jobscan** | 5 resume scans/month (scan-capped) | $49.95/mo or $89.95/3 mo (~$29.98/mo effective) |

**Market anchors:** ~$8/mo annualized (Kickresume) · ~$24–30/mo monthly (Resume.io, Teal, Rezi) · Jobscan higher (~$50/mo) as scan specialist.

---

## How much Resumegen should charge

### For today’s surface

Either stay free, or add **one cheap paid layer**:

| Option | Price | Rationale |
|--------|-------|-----------|
| Cheap subscription | **~$9/mo** | Entry without overclaiming vs Teal/Rezi |
| Annual | **~$59–72/yr** | ~$5–6/mo effective; fits episodic search |
| Search pack | **$49–59 for ~90 days** | Mirrors Teal’s 90-day pack; job hunt ≈2–4 months |

**Do not** lead with a sole **$19–29/mo** tier. Avoid early **lifetime** deals.

Job search is episodic (~2–4 months), so pure high monthly SaaS misprices short and long searches. Pack-led or cheap subscription fits better.

### When $19–30/mo becomes defensible

Only after a clear paid wedge:

1. **AI volume** (rewrites, summaries, match beyond free-taste caps), and/or  
2. **ATS / job-match scans** (resume vs JD—not templates or export alone)

Ungated PDF/DOCX is **parity**, not premium. Soft AI quota metering already exists in code (not billing): 5 / 2 / 5 per user per month when AI is on. Planned hooks with Tier-1 AI: **$9 Pro / $19 Search**, or scan-led **$19–29**.

### Suggested packaging sketch

| Tier | Price | Suggested includes |
|------|-------|--------------------|
| **Free** | $0 | Unlimited resumes, templates, PDF/DOCX, share, Kanban, extension fill, job import |
| **Pro** | ~$9/mo or pack | Higher AI quotas, share analytics (if finished), priority features |
| **Search** | ~$19/mo or $49–59/90d | AI job match volume + ATS/JD scans **once those exist** |

PLAN still gates any billing code behind an explicit product pick (Pro+quotas vs scan-led) and approval—no packaging has been product-approved for implementation.

---

## Coverage and uncertainty

- Could not inspect a live public deployment page body for Resumegen (local/private; public fetch limited)—claims grounded in repo/product code.
- PRODUCT.md “24 resume templates” vs live themes in code/marketing (~four: ats-plain, classic, modern, minimalist)—do not take template count from PRODUCT.md alone.
- README/PRODUCT may cite CLAUDE.md sections no longer present (dual-graph policy only now).
- UserLimits.php may still say AI was removed while optional AI + soft quotas exist—core free/unlimited holds; AI metering only when AI is enabled.
- Zety primary fetch failed this session; free TXT-only rests on vendor pricing feature strings.
- Resume.io / some peers partly rely on secondary reviews + prior competitive matrix, not a full fresh scrape.
- No live Teal/Jobscan/Rezi account QA; claims use vendor marketing + Resumegen source.
- Teal extension autofill-beyond-bookmark depth not established from primary pages.
- Depth of Resumegen AI job-match vs Jobscan match-rate not compared quantitatively.
- Enhancv pricing page returned broken dynamic prices; Canva not researched; Reactive Resume not re-fetched this pass.
- Geo/A-B pricing is common; figures reflect pages as returned without authenticated US checkout.
- Competitor prices partly from ~2026-07 docs—**re-verify before public pricing**.
- No production freemium conversion or WTP data post removal of billing instrumentation.
- Share-link view analytics UI completeness as a sole paid gate is only partially specified.

---

## Sources (primary grounding)

| ID | Source |
|----|--------|
| App product | README.md, PRODUCT.md, config/ai.php, extension/README.md, ResumeAnalysis.php, Jobs/Imports.tsx, UserLimits patterns |
| Project docs | docs/pricing-recommendations-2026-08.md, docs/resume-builder-competitive-analysis.md, docs/ai-reintroduction-map.md |
| Competitors | tealhq.com/pricing, resume.io/pricing, kickresume.com pricing, rezi.ai/pricing, resumegenius.com/pricing, jobscan plan UI, Teal/Jobscan/Rezi product pages |

---

*Generated from deep-research pass (2026-08). Advisory only; not a product decision.*
