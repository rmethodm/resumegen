# Progress checkpoint — Workstation AI credits

**Stopped:** 2026-09-10 (Tasks 1–12 + final review complete)  
**Branch:** `ShadEditor`  
**Resume HEAD:** `12395396` — *Close final-review gaps: unroute unmetered review, cancel gate test, Stripe env*  
**Plan:** `docs/superpowers/plans/2026-09-10-workstation-ai-credits.md`  
**Spec:** `docs/superpowers/specs/2026-09-10-workstation-ai-credits-design.md` (approved)  
**SDD ledger:** `.superpowers/sdd/2026-09-10-workstation-ai-credits/progress.md`

## Done (Tasks 1–12 + final review)

| Task | Status | Notes |
| --- | --- | --- |
| 1–10 | complete | Credits ledger, gates, Rewrite/Generate UI, Coach removed |
| 11 Buy-credits stub + docs | complete | `billing.credits` + subscriber gate; docs synced (`f02776c3`..`5dc68fdc`) |
| 12 Gate-matrix regression | complete | Guest gap-generate 401; matrix mapped (`ea2c235c`) |
| Final review fix wave | complete | Unrouted unmetered ai-review/rewrite-section; cancel/lapse tests; Stripe env (`12395396`) |

## Still deferred (do not block merge of plan code)

- check-then-spend race (no DB lock around gate + spend)
- ~~Live Optimize Generate / Rewrite not browser-verified~~ **verified 2026-09-10** on fixture `ai-credits-browser@resumegen.test` / resume 39 after `npm run build`: Rewrite showed 3 options + Accept replaced bullet; Optimize Generate (Redis) showed 3 options + Accept appended bullet; ledger 20→17 across 2 rewrites + 1 generate. Console: tip-tap duplicate `link` warning only. **Superseded 2026-09-10 (uncommitted):** Rewrite/Generate UI and its backing controller/requests/lib were subsequently removed; `ai.rewrite-bullet`, `ai.rewrite-summary`, `ai.generate-gap` are unrouted again, matching CLAUDE.md/PLAN.md/NOTES.md. This verification note describes a state that no longer holds.
- No feature test for `ai_blocked` on `billing.credits` (code present; Buy CTA hidden via `canPurchase`)
- Plan `npm test` vs repo `npm run test:js`
- Orphaned `AiService::reviewResume` / `rewriteSection` (no HTTP)
- Do not set `STRIPE_CREDITS_PRICE_ID` until a purchase grant webhook exists

## Next

Finishing-a-development-branch: **keep `ShadEditor` as-is** (user choice; no PR/merge/push). Do not push/deploy unless asked. Docs audit 2026-09-10 synced CLAUDE/PLAN/NOTES/CONTEXT/UNFORGET + ai-reintroduction-map banner to match unrouted review/section + credits model.
