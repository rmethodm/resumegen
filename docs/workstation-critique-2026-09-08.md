# Workstation Critique — 2026-09-08

Saved for later review from `/impecpeccable critique Workstation`.

| | |
|---|---|
| **Score** | **22/40** (Acceptable) |
| **Target** | `resources/js/Pages/Resumes/Workstation.tsx` |
| **Mode** | Operate (resume editor) |
| **Live URL** | `https://resumegen.test/resumes/2/workstation` |
| **Method** | Dual-agent (A design review · B detector/browser) |
| **Impeccable archive** | `.impeccable/critique/2026-09-08T10-37-23Z__resources-js-pages-resumes-workstation-tsx.md` |

---

Method: dual-agent (A: `01a08090-d620-7623-91f4-2ca102bd0e65` · B: `01a08090-d620-7623-91f4-2cbfbf2c7ab8`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Score status dominates; **Saved** only after first successful save; preview barely in first fold |
| 2 | Match System / Real World | 3 | Edit / Review / Optimize clear; score-band coaching still jargon-heavy |
| 3 | User Control and Freedom | 3 | Undo/redo exist; rename / notes / versions buried under **⋮** |
| 4 | Consistency and Standards | 2 | Marketing `#0066FF` pills vs editor intent; **Download** reads as primary CTA |
| 5 | Error Prevention | 3 | Autosave + export checklist are solid |
| 6 | Recognition Rather Than Recall | 2 | Double-click collapse, Format, notes, rename require recall |
| 7 | Flexibility and Efficiency | 2 | Almost no power-user path beyond undo/redo titles |
| 8 | Aesthetic and Minimalist Design | 1 | First fold is score + checklist + keyword wall |
| 9 | Error Recovery | 3 | Offline/conflict banner with Reload / Retry |
| 10 | Help and Documentation | 1 | Sparse help when the score strip overwhelms editing |
| **Total** | | **22/40** | **Acceptable — significant Operate fixes needed** |

## Design Specificity Verdict

**LLM assessment:** Mostly category-interchangeable — generic “AI resume coach / Notion-adjacent SaaS editor.” Resumegen-specific strengths (relational sections, Target role → Optimize JD, Live vs DomPDF, paper stage) are secondary on Edit’s first fold. **Social Proof-Focused DESIGN.md actively harms Operate specificity.**

**Deterministic scan:** `detect.mjs` exit **2** — **4** `design-system-font-size` advisories (`text-[9|10|11px]`) in:

- `resources/js/Components/workstation/inspector-fields.tsx:126`
- `resources/js/Components/workstation/inspector-sections.tsx:658`
- `resources/js/Components/workstation/inspector-sections.tsx:671`
- `resources/js/Components/workstation/section-panel.tsx:255`

`Workstation.tsx` itself clean.

**Visual overlays:** None. CSP blocked inline script injection; critique used CLI + authenticated screenshots instead.

## Overall Impression

**Review** is the product’s best moment (quiet paper theater). **Edit** opens as a grading dashboard: ~573px score strip, **52/100**, and a keyword chip wall push Contact and the live preview below the fold. Biggest opportunity: default Edit to **document + form**, demote coaching to progressive disclosure.

## What's Working

1. **Review tab document theater** — score strip hidden; Live / PDF / Zoom only when reviewing
2. **Format consolidation** — font / density / bullets / skills behind one control
3. **Target role vs JD split** + export checklist before PDF/DOCX

## Priority Issues

### [P0] First fold is a score dashboard, not an editor

Weak-band defaults expand checklist + keywords; form (~918px) and preview (~796px) drop below fold at 1440×900.

**Fix:** Collapse score drawer by default; one “Next gap” line; keep preview in first viewport at `xl+`.

**Command:** `/impeccable distill` → `/impeccable layout`

### [P1] Social Proof / `#0066FF` on Operate chrome

Selected Edit pill and accent ramp from a landing DESIGN.md.

**Fix:** Split Persuade vs Operate worlds; neutral tab selection; blue only for rare true CTAs.

**Command:** `/impeccable quieter` or Operate-scoped `/impeccable document`

### [P1] Keyword chip wall + open checklist

Dozens of chips above the form on load.

**Fix:** Top 3–5 + “Show all”; checklist collapsed; deep JD match stays on Optimize.

**Command:** `/impeccable distill`

### [P2] Action / status hierarchy

Filled Download is the visual hero; Saved missing until first save; title rename under ⋮.

**Command:** `/impeccable polish` / `/impeccable clarify`

### [P2] Template / font walls (+ detector micro-type)

**Command:** `/impeccable distill` / `/impeccable typeset`

## Persona Red Flags

- **Alex (power user):** Coach UI before form+preview; Versions behind ⋮; keyword farm slows export loops
- **Jordan (first-timer):** **52/100** + Keywords **0/25** as first impression; unclear first action
- **Sam (a11y):** Huge score-strip tab region; enormous month/year selects; icon-only ⋮
- **Multi-app seeker:** First fold optimizes completeness theater, not “ship application #7”

## Minor Observations

- Mobile score collapse is kinder than desktop
- PRODUCT.md still mentions removed AI/job-import
- Four off-ramp 9–11px type hits in dense chrome

## Questions to Consider

1. If the resume paper is the product, why is the first screen a grading dashboard?
2. Preview + Contact in 1s, or Keywords 0/25?
3. Is Social Proof meant for Welcome only — why does it own editor tokens?
4. What if Edit assumed competence and Optimize/Review owned judgment?

---

## Suggested next picks (from critique close)

### Priority direction

- **A.** First-fold focus (recommended) — collapse coach; form + preview first
- **B.** Operate theme vs Social Proof — quieter editor chrome
- **C.** Choice overload — cap chips, collapse checklist, curate pickers

### Workstation tone

- **A.** Calm Operate (recommended) — quiet chrome; paper is hero
- **B.** Keep Social Proof energy — only fix layout/load
- **C.** Split worlds — Social Proof for Welcome; Operate tokens for Workstation

### Scope

- **A.** Top 3 only (recommended) — P0 + both P1s
- **B.** Critical only — P0
- **C.** All priority issues — P0–P2

---

**Trend:** First run for this target — **22/40** (no prior trend).
