---
target: Workstation
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-09-08T10-37-23Z
slug: resources-js-pages-resumes-workstation-tsx
---
Method: dual-agent (A: 01a08090-d620-7623-91f4-2ca102bd0e65 · B: 01a08090-d620-7623-91f4-2cbfbf2c7ab8)

# Workstation Critique — Design Health

**Target:** `resources/js/Pages/Resumes/Workstation.tsx`  
**Mode:** Operate (resume editor)  
**Live:** `https://resumegen.test/resumes/2/workstation` (authenticated)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Score status dominates; Saved only after first successful save; live preview barely in first fold |
| 2 | Match System / Real World | 3 | Edit / Review / Optimize clear; “checkpoints,” score-band coaching still product jargon |
| 3 | User Control and Freedom | 3 | Undo/redo exist; rename / notes / versions buried under ⋮ More actions |
| 4 | Consistency and Standards | 2 | Marketing #0066FF pills vs editor B&W intent; Download styled as primary CTA over editing |
| 5 | Error Prevention | 3 | Autosave, export checklist modal, contact fields held back from bad saves |
| 6 | Recognition Rather Than Recall | 2 | Double-click collapse, Format popover, notes/checkpoints, rename hidden behind recall |
| 7 | Flexibility and Efficiency | 2 | Shortcut hints on undo/redo titles only; no dense power-user path for multi-version apply work |
| 8 | Aesthetic and Minimalist Design | 1 | First fold is a score + checklist + keyword wall, not the resume form or preview |
| 9 | Error Recovery | 3 | Offline/conflict banner with Reload / Retry; “Email not saving” jump chip |
| 10 | Help and Documentation | 1 | Sparse tips; no help when the score strip overwhelms the primary edit task |
| **Total** | | **22/40** | **Acceptable — significant Operate improvements needed** |

## Design Specificity Verdict

**LLM assessment:** Mostly category-interchangeable. Chrome reads as generic “AI resume coach / Notion-adjacent SaaS editor.” Resumegen-specific strengths (relational section cards, Target role → Optimize JD split, Live vs DomPDF on Review, document paper stage) are secondary on Edit’s first fold. Social Proof-Focused DESIGN.md (#0066FF, landing persuasion) actively harms Operate specificity.

**Deterministic scan:** `detect.mjs` exit 2 — **4 findings**, all `design-system-font-size` (advisory): arbitrary `text-[9px|10px|11px]` in `inspector-fields.tsx:126`, `inspector-sections.tsx:658/671`, `section-panel.tsx:255`. Workstation.tsx itself clean. Detector agrees the type ramp is drifting from DESIGN.md; product density may intentionally keep these, but they are real off-ramp sizes.

**Visual overlays:** No reliable user-visible overlay. Preflight mutation failed (CSP blocked inline script execution). CLI + authenticated screenshots used instead.

## Overall Impression

The Review tab’s paper theater is the product’s best moment. Edit opens as a grading dashboard: **52/100**, keyword chip walls, and a ~573px score strip push Contact and the live preview below the fold. Biggest opportunity: make Edit default to **document + form**, and demote coaching to progressive disclosure.

## What's Working

1. **Review tab document theater** — score strip hidden; Live / PDF / Zoom only when reviewing; paper stage matches DomPDF.
2. **Format consolidation** — Font / density / bullets / skills behind one Format control, with ≈page estimates.
3. **Target role vs JD split** — thin Target role on Edit; JD paste on Optimize; export checklist before PDF/DOCX.

## Priority Issues

**[P0] First fold is a score dashboard, not an editor**
- **What:** Weak-band default expands checklist + keywords; form and sticky preview drop below the fold (~918px / ~796px at 1440×900).
- **Why:** Primary Operate task delayed; users feel graded before they work.
- **Fix:** Default score drawer collapsed; one “Next gap” line + section chips; guarantee preview in first viewport at xl+.
- **Suggested command:** `/impeccable distill` then `/impeccable layout`

**[P1] Social Proof / #0066FF world on Operate chrome**
- **What:** Selected Edit pill and accent ramp from marketing DESIGN.md conflict with editor B&W intent.
- **Why:** Conversion-landing chrome on a task tool; not Resumegen-authored Operate UI.
- **Fix:** Separate Persuade vs Operate surface briefs; neutral selected states for tabs; reserve blue for rare true CTAs.
- **Suggested command:** `/impeccable quieter` or `/impeccable document` (Operate brief) then token realign

**[P1] Keyword chip wall + open checklist = choice overload**
- **What:** Dozens of missing-keyword chips above the form on load.
- **Why:** Extraneous load before intrinsic resume work.
- **Fix:** Top 3–5 keywords + “Show all”; checklist collapsed; deep JD match stays on Optimize.
- **Suggested command:** `/impeccable distill`

**[P2] Primary actions and status hierarchy are off**
- **What:** Filled Download reads as hero; Saved absent until first round-trip; title rename under ⋮.
- **Why:** Undermines trust; buries version hygiene for multi-app seekers.
- **Fix:** Always show idle/saving/saved/error; inline title edit; demote Download to outline parity with Share.
- **Suggested command:** `/impeccable polish` / `/impeccable clarify`

**[P2] Template / font pickers are walls of options**
- **What:** Large template grid; ~18 fonts in one list; detector also flags sub-12px chrome type.
- **Why:** Hicks’s Law tax for secondary decisions.
- **Fix:** 3–4 recommended templates + Browse all; group fonts; lift micro type onto the ramp.
- **Suggested command:** `/impeccable distill` / `/impeccable typeset`

## Persona Red Flags

**Alex (Power User):** Lands in coach UI not form+preview; Versions/duplicate/notes behind ⋮; no keyboard map beyond undo/redo titles; keyword farm slows tweak-and-export loops.

**Jordan (First-Timer):** 52/100 + Keywords 0/25 as first impression; unclear first action; Optimize vs score-strip Job Match duplication; double-click collapse undiscoverable.

**Sam (Accessibility):** Huge score strip tab-stop region before fields; month/year selects announce enormous option lists; icon-only ⋮; save state often missing.

**Multi-app Job Seeker (project):** Needs fast versioning per company and quick PDF; first fold optimizes for completeness theater, not “ship application #7 today.”

## Minor Observations

- Mobile score collapse is kinder — desktop should learn from it.
- ≈N pages hint easy to miss beside Format.
- PRODUCT.md still mentions removed AI/job-import surfaces — context drift.
- Four detector hits on 9–11px type in inspector/section chrome.

## Questions to Consider

1. If the resume paper is the product, why is the first screen a grading dashboard?
2. Would a multi-app seeker rather see preview + Contact in 1 second, or Keywords 0/25?
3. Is Social Proof DESIGN.md meant for Welcome only — and if so, why does it own editor tokens?
4. What if Edit assumed competence and Optimize/Review owned judgment?
