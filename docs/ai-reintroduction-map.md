# AI reintroduction map — Resumegen (2026-08)

> Advisory for everything below Tier 1. **Bullet rewrite and summary generate/tailor (both
> marked ★ Tier 1 below) shipped 2026-08-04** as `ResumeAiController` + `OpenAiResumeAssistant`,
> disabled by default via `AI_ENABLED`/`OPENAI_API_KEY` in `config/ai.php` — see CLAUDE.md's
> "AI" section. Everything else on this map (import, JD keyword match/gap-fix, multi-section
> tailor) is still unbuilt.
> Product rule: do **not** implement AI beyond the shipped Tier-1 slice without explicit
> product approval (see CLAUDE.md). The app is free — no paid tiers, no metering-for-payment.

---

## Design principles

1. **Edit-in-place, never black-box replace** — propose → accept/reject; user keeps control.
2. **Meter by action**, not vague “Pro.” Free gets a taste; paid unlocks volume.
3. **Do not gate PDF/DOCX** or watermark free exports to fund AI.
4. **Keep strength score deterministic** — AI may explain gaps or suggest fixes; it does not own the number.
5. **Narrow tools beat open chat** — “Improve this bullet” over a freeform sidebar.
6. **Job context multiplies value** — rewrites that take `target_role` + pasted JD feel paid-worthy.

---

## Placement map

```
Onboarding / new resume
  └─ Import (PDF / LinkedIn paste)           [Tier 2]

Workstation editing loop
  ├─ Bullets → rewrite / coach               [Tier 1 ★]
  ├─ Summary → generate / tailor             [Tier 1 ★]
  └─ Multi-section tailor (later)            [Tier 2]

Optimize / job target
  ├─ JD paste (already in product)
  ├─ Keyword match (prefer rules first)      [Tier 1 ★]
  └─ AI rewrites to close gaps               [Tier 1 ★]

Compare / versions
  └─ Review AI-proposed diffs                [support surface]

Export / share
  └─ Leave AI out                            [export stays free parity]
```

### Where in the UI (today)

| Surface | Hook already in product | AI role |
|---|---|---|
| Experience / project bullets | `BulletEditor`, inspector forms | Rewrite, coach, generate from notes |
| Professional summary | Summary section in workstation | Generate, tailor to JD |
| Optimize tab | Job description field (ATS panel used to live here) | Keyword match → gap rewrites |
| Strength score | Deterministic scorer + gauge | Explain / “fix these gaps” only |
| Compare | Version diff | Accept multi-field AI proposals later |
| Create / starter profile | Seed path | Import (Tier 2) |

---

## Tier ranking

### Tier 1 — Ship first (highest leverage)

| # | Feature | Why first |
|---|---|---|
| 1 | **Bullet rewrite / coach** | Daily writing surface; small metered calls; clear accept/reject |
| 2 | **JD match** (rules first, then AI “fix gaps”) | Jobscan-class WTP; Optimize tab ready; scan metering story |
| 3 | **Summary generate / tailor** | One field, high perceived value, low COGS |

### Tier 2 — Strong, heavier build

| Feature | Note |
|---|---|
| **Resume import** (PDF / paste → structured rows) | Best activation; maps to `ResumeDocument`; async + review-before-save |
| **Whole-resume tailor** | Multi-section proposals; use compare/diff UX; higher cost and hallucination risk |

### Tier 3 — Later / optional

| Feature | Note |
|---|---|
| Cover letter draft | Only if cover letters return as a product surface |
| Interview coach | Adjacent career product; not core builder loop |
| Template / layout advice | Fluff; layout is already deterministic |
| Share / recruiter blurb | Thin value vs bullets + JD |
| AI-owned strength score | **Avoid** — keep score rules-based |

### Explicit non-goals (unless scope expands)

- Chat-first “build my whole resume”
- AI template design
- Export paywall funded by AI COGS
- Replacing the deterministic strength score with an opaque model score

---

## Suggested ship order

| Step | What | Outcome |
|---|---|---|
| 1 | Bullet rewrite (+ optional coach) | Editing loop feels “AI-powered” |
| 2 | JD keyword match (deterministic) + AI gap rewrites | Monetizable scan / tailor story |
| 3 | Summary generate / tailor | Completes the writing loop |
| Later | Import | Activation for empty-start users |

Former removed features (historical only): bullet rewrite, bullet coach, summary gen, ATS keywords, interview coach, cover-letter draft, PDF/LinkedIn import. Prefer **product fit above**, not a 1:1 revive of the old stack.

---

## Free vs Paid matrix — Tier 1 only

Assumes free export stays unlimited; AI is the metered wedge.
Numbers are planning defaults — re-tune after COGS and usage data.

### Feature matrix

| Capability | Free | Paid |
|---|---|---|
| **Edit + unlimited resumes / versions** | Full | Full |
| **PDF / DOCX export** | Unlimited, no watermark | Same |
| **Templates** | Full (or almost full) | Same |
| **Strength score** | Full (deterministic) | Full + optional AI “explain gaps” |
| **Bullet rewrite** | **5 / month** | Unlimited or high cap (e.g. 200 / mo) |
| **Bullet coach** (critique only) | **10 / month** or free while rewrite quota remains | Unlimited |
| **Summary generate** | **2 / month** | Unlimited or high cap (e.g. 30 / mo) |
| **Summary tailor to JD** | Counts as 1 summary use | Same pool or unlimited |
| **JD keyword match** (rules, no LLM) | **3 scans / month** | Unlimited or high cap (e.g. 50 / mo) |
| **AI “rewrite to cover missing keywords”** | **2 gap-fix packs / month** (or 0 until paid) | Unlimited or high cap |
| **Target role / JD stored on resume** | Full | Full |

**Coach vs rewrite:** coach can be slightly more generous on free (cheaper / shorter prompts). Gap-fix packs are the premium step after a free scan shows missing terms.

### What “one use” means

| Action | Counts as |
|---|---|
| Rewrite one bullet (any tone) | 1 bullet rewrite |
| Coach feedback on one bullet (no replace) | 1 coach use (optional separate pool) |
| Generate or regenerate professional summary | 1 summary use |
| Tailor summary to a pasted JD | 1 summary use |
| Run keyword coverage on one JD + one resume | 1 scan |
| Accept AI suggestions that rewrite N bullets for that JD | 1 gap-fix pack (not N rewrites) — simpler UX; or count N against bullet quota if you want tighter COGS control |

Prefer **gap-fix pack** for Optimize so users aren’t punished for long experience sections.

### Free experience goals

- User finishes a real resume without paying.
- Hits one “wow” AI moment (e.g. one strong bullet rewrite or one scan report).
- Feels the ceiling during an active search (many bullets + several JDs), not on first open.

---

## Cost & product constraints

| Risk | Mitigation |
|---|---|
| Hallucinated metrics / employers | Never auto-save; show diffs; optional “only rephrase, don’t invent numbers” mode |
| COGS spikes | Hard usage caps (monthly cap, like the existing `AI_MONTHLY_LIMIT`); async for import only |
| Score trust erosion | Keep scorer deterministic; AI never mutates the score formula |
| Scope creep | Ship Tier 1 only before interview coach / cover letters / chat |

---

## Implementation sketch (not a build plan)

When approved, natural insertion points (names for orientation only):

| Layer | Likely home |
|---|---|
| UI | `BulletEditor` actions; summary section; Optimize tab panel |
| API | Small dedicated endpoints (not chat) — e.g. rewrite bullet, generate summary, scan JD |
| Domain | Resume + job description context only; no admin/AI history product required for v1 |
| Tests | Quota edges, accept/reject does not auto-write without user confirm, scan without LLM stays free-path |

Full implementation plan should use TDD and explicit approval before any provider keys or AI packages land. The app is free — no billing/metering-for-payment work.

---

## Related docs

- `docs/ai-provider-comparison-2026-08.md` — Claude vs OpenAI vs Grok cost/quality pick (2026-08)
- `docs/claude-design-import-notes-2026-08.md` — how to hand off Claude Design exports into this repo
- `docs/resume-builder-competitive-analysis.md` — market anchors (historical)
- CLAUDE.md — AI removed; reintroduce only with product decision

---

## Next steps (optional, not started)

1. Product pick: which Tier 1 scope to ship (bullet rewrite vs scan-led) — no paid tier attached
2. Spec one endpoint + one UI control for **bullet rewrite** only (vertical slice)
3. Deterministic JD keyword matcher **before** any LLM on Optimize (cheaper, shippable alone)
4. Provider default: see `docs/ai-provider-comparison-2026-08.md` (OpenAI mini/nano recommended)
