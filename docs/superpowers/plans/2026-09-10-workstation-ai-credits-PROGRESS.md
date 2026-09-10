# Progress checkpoint — Workstation AI credits

**Stopped:** 2026-09-10 (session paused at user request)  
**Branch:** `ShadEditor`  
**Resume HEAD:** `08f097d0` — *Use draft job description for Optimize Generate-for-gap*  
**Plan:** `docs/superpowers/plans/2026-09-10-workstation-ai-credits.md`  
**Spec:** `docs/superpowers/specs/2026-09-10-workstation-ai-credits-design.md` (approved)  
**SDD ledger:** `.superpowers/sdd/2026-09-10-workstation-ai-credits/progress.md`

## Done (Tasks 1–10, reviewed)

| Task | Status | Notes |
| --- | --- | --- |
| 1 Config + ledger migration | complete | `config/ai.php`, `ai_credit_ledger`, starter flag |
| 2 AiCreditService + model | complete | balance/grant/spend/starter; Billable kept on User (ruling) |
| 3 AiUsageLimiter + subscribe helper | complete | 402/429 statuses; Cashier `subscribed('default')` |
| 4 Starter webhook | complete | `GrantAiStarterCredits` on `subscription.created` |
| 5 Rewrite → `options[]` + debit | complete | FormRequests/routes committed; section spends too |
| 6 Generate-for-gap API | complete | `ai.generate-gap` |
| 7 Inertia `aiCredits` | complete | flash share restored after regression |
| 8 Bullets UI options + credits | complete | 402→0 balance, in-flight ref, prop sync |
| 9 Remove Coach + summary rewrite | complete | `POST /ai/rewrite-summary`; Coach tab removed |
| 10 Optimize Generate UI | complete | draft JD in POST; `experience_index`; 12-bullet cap |

## Not done

| Task | Status | Resume how |
| --- | --- | --- |
| **11** Buy-credits stub + docs | **interrupted** | Subagent killed mid-work. `BillingController::credits()` exists on disk (untracked file) with stub flash “AI credit packs coming soon”; **`billing.credits` route was reverted** so named-route does not 500. Buy CTAs already fall back to `billing.portal` via `gap-generate.ts`. Finish: add route + `cashier.credits_price_id` config, wire Buy → `billing.credits`, surgically update CLAUDE/PRODUCT/README for **$9.95 + credits** (current docs still describe old “scaffold / 10-day cap”). |
| **12** Full gate-matrix regression | pending | Run checklist in plan Task 12 after Task 11. |
| Final whole-branch review | pending | SDD final reviewer + `finishing-a-development-branch`. |
| Browser verify | **not done** | Live Rewrite / Generate clicks not exercised in browser. |

## Rulings worth keeping

1. Empty migration `down()` — forward-only.  
2. Keep `Billable` / `aiRequests` / `ai_blocked` casts on User (were missing; needed for T3–T5).  
3. `subscribedForAi` = Cashier `subscribed('default')` (includes grace until `ends_at`).  
4. `experience_index` accepted on generate-gap because experience row IDs are recreated on save.  
5. Task 11 partial route addition reverted on stop — resume Task 11 from plan brief, not from half-applied route.

## Deferred minors

- Check-then-spend race (no DB lock around balance gate + spend).  
- Live Optimize Generate / Rewrite not browser-verified.  
- Docs (CLAUDE/PRODUCT/README) still stale vs shipped AI credits model — Task 11.

## Next session kickoff

```text
Read docs/superpowers/plans/2026-09-10-workstation-ai-credits-PROGRESS.md
and .superpowers/sdd/2026-09-10-workstation-ai-credits/progress.md.
Resume SDD on branch ShadEditor at 08f097d0: Task 11, then Task 12,
then final branch review. Do not re-do Tasks 1–10.
```
