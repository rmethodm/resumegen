# AI feature discovery for unsubscribed users

**Date:** 2026-09-10  
**Status:** Approved in brainstorm (Approach A)  
**Parent:** `docs/superpowers/specs/2026-09-10-workstation-ai-credits-design.md`

## Problem

Yesterday’s AI credits work gates generative controls with `bulletRewriteControl`. When `subscribed` is false, that helper returns `visible: false`, so Rewrite / Generate never appear. Users with no subscription (and therefore no credits) cannot discover that AI exists or that a subscription unlocks it.

This was partly intentional in the parent spec (“Not subscribed — hide on Edit; optional quiet upsell on Optimize”), but the hide path removed the discovery surface entirely.

## Goal

For **not-subscribed** users, show generative AI controls **in context**, locked, and route a click straight to Subscribe checkout so they can enhance the app with AI.

Success: a never-subscribed account sees Rewrite and Generate where they belong, understands they cost credits behind a subscription, and can start checkout in one click.

## Non-goals

- Persistent Workstation header credit/Subscribe chip
- Dismissible Optimize promo card / coach marks / first-visit modals
- Credit-pack purchase webhook / enabling `STRIPE_CREDITS_PRICE_ID`
- Email low-balance alerts, auto top-up
- Changing `ai_blocked` policy (still no Buy/Subscribe CTA)
- Soft limits / overage charging

## Industry context (research summary)

Common patterns for empty or unpaid AI:

- **Feature lock at the control** (Candu Layer 3): show the action locked; click is high-intent upgrade — strongest fit here.
- **Notice by the input** (Caffeine AI): Upgrade vs Top up depending on plan state.
- **Always-visible cost + balance** (Leonardo, Stigg widgets): cost before click; low balance → upgrade/buy.
- **CTA split by tier** (ChatGPT Codex): free → upgrade plan; paid → buy credits.
- **Warn then pause** (Framer): 80% warning, 100% pause credit features; free helpers keep working.

Consensus for discovery: do not hide the capability; show it locked with a billing-state-appropriate CTA.

## Decision

**Approach A — In-context locked controls only.**

| State | Control | Click |
| --- | --- | --- |
| Not subscribed | Visible, locked | → existing `billing.checkout` (Stripe Checkout) |
| Subscribed, balance ≥ 1 | Visible, enabled | → generative request (unchanged) |
| Subscribed, balance = 0 | Visible, locked; “Out of AI credits” | Buy path unchanged (stub until packs ship) |
| `ai_blocked` | Visible, locked | No Subscribe/Buy CTA |

Surfaces (all three generative controls):

1. Bullet Rewrite (`bullets-editor`)
2. Summary Rewrite (inspector summary)
3. Optimize Generate-for-gap (`optimize-panel`)

No new modal, no new routes. Click when not subscribed goes straight to checkout.

## Technical shape

Shared helper today: `resources/js/lib/bullet-rewrite.ts` → `bulletRewriteControl` (also used by `gapGenerateControl`).

Change for not subscribed:

- `visible: true` (was `false`)
- `disabled: true` (or equivalent locked affordance)
- Title / hint such as Subscribe to unlock (exact copy left to implement, keep short)
- Callers that currently skip rendering when `!visible` keep working once visible is true
- When locked **because not subscribed**, click must not POST to AI; navigate / visit `route('billing.checkout')` instead

Files expected to change (illustrative, not exhaustive):

- `resources/js/lib/bullet-rewrite.ts` (+ unit tests)
- `resources/js/lib/gap-generate.ts` if it needs a distinct CTA hint
- `resources/js/Components/workstation/bullets-editor.tsx`
- `resources/js/Components/workstation/inspector-sections.tsx` (summary rewrite)
- `resources/js/Components/workstation/optimize-panel.tsx`

Backend billing checkout and AI 402/429 behavior stay as-is. Server remains source of truth for spend.

## Copy constraints

- Keep cost framing on the control label where it already exists (`Rewrite · 1 credit` / Generate equivalent).
- Locked-not-subscribed: short unlock hint (tooltip/title), not a sales paragraph.
- Do not invent unlimited-AI marketing or extra tiers.

## Testing

- Unit: `bulletRewriteControl` / `gapGenerateControl` states for not subscribed → visible + locked; subscribed with balance; zero balance; `canPurchase` false (`ai_blocked`).
- Component or light interaction: locked-unsubscribed click targets checkout, does not call AI endpoints.
- Manual / browser: logged-in unsubscribed user sees locked Rewrite and Generate; click opens Stripe Checkout (or app’s existing checkout redirect).

## Relationship to parent spec

This **supersedes** parent §3 item 1 for Edit:

- Before: “Not subscribed — hide on Edit; optional quiet upsell on Optimize.”
- After: “Not subscribed — show locked generative controls in place; click → Subscribe checkout.”

Other parent rules (credit ledger, costs, diagnose free, unrouted review/section rewrite) unchanged.

## Open follow-ups (explicitly deferred)

- Subscribed-at-zero Buy UX once credit packs + grant webhook exist
- Optional Optimize card or header chip if discovery still feels weak after A ships
