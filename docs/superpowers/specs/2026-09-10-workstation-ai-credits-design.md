# Workstation AI: Tailor + inline rewrite under subscription credits

Date: 2026-09-10  
Status: approved

## Relationship to prior work

This design **supersedes** the Coach-sidebar / full-resume-review-as-primary-UX parts of
`docs/superpowers/specs/2026-09-09-ai-review-and-bullet-rewrite-ui-design.md`.

What remains valid from that work if already partially implemented:

- Inline bullet rewrite with explicit Accept/Discard (extend to **2–3 options**).
- CSRF/fetch conventions for non-Inertia AI POSTs.
- Logging to `ai_requests` and populating `cost_micro_cents` when available.
- No chat agent, no translation, no career map.

What this design replaces:

- Always-on Coach panel on Edit as the primary AI surface.
- Count-based free AI (10/day) as the product gate — replaced by **subscription + credit ledger**.
- Single-string AI responses as the long-term API shape — v1 returns **options[]**.

## Context

Resumegen’s Workstation AI (Coach sidebar + single “Rewrite with AI”) reads as bolted-on
compared to Teal/Rezi-style **JD tailor loops** and **inline multi-option rewrites**.

Monetization (product decision, 2026-09-10 brainstorm):

1. **$9.95/mo** — entire app with all non-AI features.
2. **AI credits** — required for any generative AI; at 0 credits, AI is disabled.
3. **Only paid subscribers** may purchase AI credits.
4. **First subscribe** grants a **starter credit pack** (once).
5. **Unused credits roll over** month to month **while subscribed**.

Billing/Cashier is scaffolded today; this spec defines the AI product + ledger behavior the
Workstation must implement against.

## Goals

- Split **diagnose (included with $9.95)** from **draft/rewrite (credits)**.
- Ship **A+B hybrid**: Optimize tailor loop + sparse Edit inline rewrite; **no Coach sidebar**.
- Gate all generative routes on **active subscription + sufficient credits + not `ai_blocked`**.
- Always show **2–3 options**; never silent-overwrite user text.
- Debit credits **only after** a successful model response.
- Make zero-credit and non-subscriber states intentional (disabled + CTA), not broken-looking.

## Non-goals (v1)

- Chat / “AI resume agent”.
- Always-on Coach / default deep full-resume review UI (may return later as an explicit
  high-credit Optimize action).
- AI on every field (skills, education, contact stay manual).
- Unlimited AI on the $9.95 plan.
- Final Stripe pack SKUs / prices (config + stub Buy path acceptable if packs not live).
- Free-tier product packaging beyond: non-subscribers cannot buy or spend AI credits.

## 1. Information architecture

### Layers

| Layer | Audience | Surface | Cost |
| --- | --- | --- | --- |
| Diagnose | Active subscribers | Optimize tab: match %, missing keywords, deterministic heuristics | Included in $9.95 |
| Draft / rewrite | Subscribers with credit balance > 0 | Optimize “Generate” + Edit summary/bullets “Rewrite” | Credits |

### Tabs

- **Edit** — content editing; **sparse** AI on summary and bullets only (`Rewrite · N credits`). No Coach card.
- **Review** — preview / PDF; no AI panel.
- **Optimize** — Tailor home: target JD, free diagnose, credit **Generate** for gaps/keywords.

### Mental model

1. Subscribe → full workstation + starter credits (once).
2. Paste/keep target JD → Optimize diagnoses for free.
3. Spend credits only on Generate / Rewrite (options → Accept/Discard).
4. Rollover while subscribed; at 0 credits diagnose still works.

## 2. Credit product rules

- Hold / buy / spend AI credits: **active subscribers only**.
- **Starter grant**: on first successful subscription, grant `AI_STARTER_CREDITS` once
  (default **20** until pricing says otherwise; config, not hardcoded magic in UI copy only).
- **Rollover**: no monthly expiry of unused balance while subscription remains active.
- **Cancel / lapse**: generative AI blocked; balance may remain visible
  (“N credits · renew to use”) but **not spendable** until resubscribed.
- Credits are **per user**, not per resume.
- `users.ai_blocked` — hard refuse all generative actions; no Buy CTA.

### Relative action costs (config)

| Action | Default cost | Notes |
| --- | --- | --- |
| Inline Rewrite (bullet or summary → 2–3 options) | 1 | High frequency |
| Optimize Generate-for-gap/keyword (2–3 options) | 1 | Same class |
| Deep review (deferred) | 3+ | Not v1 UI |

Regenerate / “Try again” costs another full action credit. Cost is always visible on the control before click. No confirmation modal for 1-credit actions.

## 3. Gating UI states

Every generative control supports:

1. **Not subscribed** — show locked generative controls in place; click → Subscribe checkout (`billing.checkout`). (Superseded 2026-09-10 by `docs/superpowers/specs/2026-09-10-ai-feature-discovery-unsubscribed-design.md`; Approach A.)
2. **Subscribed, balance > 0** — enabled; label includes cost; optional `N credits left` in Optimize header / account chrome.
3. **Subscribed, balance = 0** — visible but disabled; “Out of AI credits” + Buy credits.
4. **In flight** — busy; client does not decrement until server returns success + `credits_remaining`.
5. **Race / insufficient** — refuse; toast; refresh balance; no partial apply.
6. **`ai_blocked`** — disabled; no Buy CTA.

Shared Inertia prop (name illustrative):

```ts
aiCredits: {
  balance: number;
  subscribed: boolean;
  canPurchase: boolean; // subscribed && !ai_blocked
}
```

Successful AI JSON responses include `credits_remaining` so the client can update without a full reload.

**First-subscribe:** flash/banner after checkout — starter balance + “Paste a job description on Optimize to tailor.” Do **not** auto-invoke AI.

## 4. User flows

### F1 — Tailor (Optimize)

1. Target JD on resume (existing field).
2. Free: match %, missing keywords, heuristic checklist (e.g. missing metrics, weak verbs, length) — deterministic preferred.
3. User selects a keyword/gap + experience role → **Generate · 1 credit**.
4. Server: sub + balance + !blocked → model → return `{ options: string[2..3], credits_remaining }` → debit.
5. Accept inserts into that role’s bullets; Discard keeps as-is.

Without a target JD: generic free heuristics only; Generate-for-keyword disabled with CTA to add JD. Inline Rewrite still allowed.

### F2 — Inline rewrite (Edit)

1. Cursor in bullet list item, or summary focused.
2. **Rewrite · 1 credit** → 2–3 options → Accept replaces target text / Discard.
3. If target JD present, prompt is JD-aware; else strengthen for clarity/impact only.
4. Prefer sending current text in the POST body so rewrite is not blocked on autosave flush.

### F3 — Zero credits / non-subscriber

Diagnose (for subscribers) still runs. Generative controls disabled or hidden per §3.

## 5. Backend shape

| Piece | Responsibility |
| --- | --- |
| Cashier subscription | `subscribed === true` only for allowed statuses (define in implementation: typically `active` and `trialing`; **not** `canceled`, `unpaid`, `incomplete`; confirm `past_due` = treat as not subscribed for AI). |
| Credit ledger | Append-only grants/spends; balance = sum of signed amounts; starter grant idempotent per user; purchase grants when packs exist. |
| `AiUsageLimiter` (evolve) | Refuse if `ai_blocked` OR not subscribed OR balance &lt; cost. On success path only, debit `cost` and log `ai_requests`. |
| Endpoints | `POST /ai/rewrite-bullet` (and summary variant or shared rewrite) return `options[]` + `credits_remaining`. New or extended **generate-for-gap** for Optimize. Throttle e.g. `20,1` retained. Ownership checks stay inline. |
| Debit timing | **Debit only after successful model response.** OpenAI failure → no debit. |
| Webhook | Subscription created (first time) → starter credit grant once. |

### Response shape (generative success)

```json
{
  "options": ["…", "…", "…"],
  "credits_remaining": 17
}
```

Do not ship new UI against a single `text` field only; migrate callers to `options`.

### Coach / `ai-review`

Not exposed in Workstation v1. Existing `reviewResume` may remain unused by UI or be deferred for a later explicit high-credit action. Do not mount `CoachPanel` on Edit.

## 6. Edge cases

- Double-click: one in-flight request per control; at most one debit per successful response.
- Multiple resume versions: one user balance.
- Credit top-up mid-session: refresh `aiCredits` / use `credits_remaining` from next response.
- Rollover: no expiry job in v1 while subscribed.

## 7. Testing requirements

Encode *why* gates exist (paid AI must not run free; failed calls must not bill credits):

- Non-subscriber → generative routes refused.
- Subscriber, 0 credits → refused; diagnose endpoints/logic still available where applicable.
- Subscriber, sufficient credits → `options` length 2–3; balance decremented once.
- Model failure / fake error → balance unchanged.
- Starter grant once on first subscribe (feature test with Cashier fakes / ledger assertions).
- Cancel/lapse → cannot spend even if balance &gt; 0.
- Frontend/unit: Accept/Discard; disabled labeling at 0 credits; no Coach on Edit.

## 8. v1 scope cut

**In**

- IA (Optimize diagnose + Generate; Edit sparse Rewrite; no Coach).
- Credit ledger + starter grant + rollover-while-subscribed + lock on lapse.
- 2–3 options on Generate and Rewrite; debit-after-success.
- Inertia `aiCredits` (+ `credits_remaining` on AI responses).
- Gate matrix tests.

**Out**

- Chat agent; Coach sidebar; deep review as default.
- Polished multi-pack storefront if Stripe pack prices unset (Buy → portal/checkout stub OK).
- AI on non-summary/non-bullet fields.

## 9. Success criteria

1. Subscriber with credits can Generate (Optimize) and Rewrite (Edit) with 2–3 options and Accept/Discard.
2. At 0 credits, diagnose works; AI controls disabled with Buy path.
3. Non-subscriber cannot spend or purchase credits.
4. First subscribe grants starter credits once; no auto AI call.
5. Credits roll over while subscribed; cancel locks spend.
6. Failed model calls do not consume credits.
7. No Coach sidebar on Edit.
8. Optimize diagnose usable with zero credits (supports $9.95 value).

## Open config defaults (change without redesign)

- `AI_STARTER_CREDITS` = 20  
- Rewrite / Generate = 1 credit  
- Deep review (future) = 3+  
- Subscribed statuses for AI = `active`, `trialing` (confirm at implement time against Cashier)
