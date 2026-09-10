# AI Feature Discovery (Unsubscribed) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show locked Rewrite / Generate controls to not-subscribed Workstation users and send a click straight to Stripe Subscribe checkout (`billing.checkout`), without calling AI endpoints.

**Architecture:** Keep one shared gate helper (`bulletRewriteControl`, reused by `gapGenerateControl`). Change the not-subscribed branch from `visible: false` to `visible: true` + locked, with an explicit `lockReason: 'subscribe'`. Callers that currently skip render when `!visible` start showing the control; when `lockReason === 'subscribe'`, they navigate to `route('billing.checkout')` instead of POSTing. Do not HTML-`disabled` the subscribe-locked control (native/`Button` disabled blocks clicks via `pointer-events-none`). Backend billing and 402/429 stay unchanged.

**Tech Stack:** React 19 + TypeScript (Inertia Workstation), Vitest (`npm run test:js`), Ziggy `route()`, existing Cashier `billing.checkout`.

**Spec:** `docs/superpowers/specs/2026-09-10-ai-feature-discovery-unsubscribed-design.md`

## Global Constraints

- Audience: **authenticated, not subscribed** (Approach A only). Guests still get `aiCredits: null` → stay hidden.
- Surfaces: bullet Rewrite, summary Rewrite, Optimize Generate-for-gap — all three.
- Click when not subscribed → **`billing.checkout` only**. No new modal, route, or promo card.
- Keep cost labels: `Rewrite · 1 credit` / `Generate · 1 credit`.
- Locked-not-subscribed hint: short title **`Subscribe to unlock`** (tooltip/`title`), not marketing copy.
- `ai_blocked` (`subscribed && !canPurchase`): still visible, locked, **no** Subscribe/Buy CTA.
- Subscribed balance = 0: keep existing “Out of AI credits” + Buy path (`creditsPurchaseHref`); do not invent pack UX.
- Server remains source of truth for spend; this plan is front-end discovery only.
- JS tests: `npm run test:js` (not `npm test`).
- No PHP / migration / Cashier changes in this plan.

## File map

| File | Responsibility |
| --- | --- |
| `resources/js/lib/bullet-rewrite.ts` | Gate shape: visibility, lock, `lockReason`, titles |
| `resources/js/lib/bullet-rewrite.test.ts` | Unit matrix for control states |
| `resources/js/lib/gap-generate.ts` | Reuses control; `subscriptionCheckoutHref()`; click resolver |
| `resources/js/lib/gap-generate.test.ts` | Generate label + subscribe visibility + resolver |
| `resources/js/Components/workstation/bullets-editor.tsx` | Bullet Rewrite locked → checkout |
| `resources/js/Components/workstation/inspector-sections.tsx` | Summary Rewrite locked → checkout |
| `resources/js/Components/workstation/optimize-panel.tsx` | Generate locked → checkout |
| `docs/superpowers/specs/2026-09-10-workstation-ai-credits-design.md` | One-line supersession note for §3 item 1 |

---

### Task 1: Gate helper — show locked when not subscribed

**Files:**
- Modify: `resources/js/lib/bullet-rewrite.ts`
- Modify: `resources/js/lib/bullet-rewrite.test.ts`
- Modify: `resources/js/lib/gap-generate.test.ts` (expectation only; still wraps the helper)

**Interfaces:**
- Consumes: existing `BulletRewriteCredits = { balance, subscribed, canPurchase }`
- Produces:

```ts
export type AiControlLockReason = 'subscribe' | 'credits' | 'blocked';

export function bulletRewriteControl(credits: BulletRewriteCredits | null): {
    visible: boolean;
    disabled: boolean;
    title?: string;
    label: string;
    lockReason?: AiControlLockReason;
};
```

- [ ] **Step 1: Write the failing tests**

Replace the “hides when not subscribed” case in `bullet-rewrite.test.ts` and add `lockReason` assertions on sibling cases:

```ts
describe('bulletRewriteControl', () => {
    it('shows locked Subscribe to unlock when not subscribed', () => {
        expect(
            bulletRewriteControl({
                balance: 20,
                subscribed: false,
                canPurchase: false,
            }),
        ).toEqual({
            visible: true,
            disabled: true,
            title: 'Subscribe to unlock',
            label: 'Rewrite · 1 credit',
            lockReason: 'subscribe',
        });
        expect(bulletRewriteControl(null).visible).toBe(false);
        expect(bulletRewriteControl(null).lockReason).toBeUndefined();
    });

    it('disables without a purchase title when blocked', () => {
        expect(
            bulletRewriteControl({
                balance: 20,
                subscribed: true,
                canPurchase: false,
            }),
        ).toEqual({
            visible: true,
            disabled: true,
            label: 'Rewrite · 1 credit',
            lockReason: 'blocked',
        });
    });

    it('disables with Out of AI credits when subscribed and balance is 0', () => {
        expect(
            bulletRewriteControl({
                balance: 0,
                subscribed: true,
                canPurchase: true,
            }),
        ).toEqual({
            visible: true,
            disabled: true,
            title: 'Out of AI credits',
            label: 'Rewrite · 1 credit',
            lockReason: 'credits',
        });
    });

    it('enables Rewrite · 1 credit when canPurchase and balance >= 1', () => {
        expect(
            bulletRewriteControl({
                balance: 1,
                subscribed: true,
                canPurchase: true,
            }),
        ).toEqual({
            visible: true,
            disabled: false,
            label: 'Rewrite · 1 credit',
        });
    });
});
```

In `gap-generate.test.ts`, replace the hide case:

```ts
it('shows locked Subscribe to unlock when not subscribed', () => {
    expect(
        gapGenerateControl({
            balance: 20,
            subscribed: false,
            canPurchase: false,
        }),
    ).toEqual({
        visible: true,
        disabled: true,
        title: 'Subscribe to unlock',
        label: 'Generate · 1 credit',
        lockReason: 'subscribe',
    });
    expect(gapGenerateControl(null).visible).toBe(false);
});
```

Update the zero-balance and enabled gap cases to include `lockReason: 'credits'` on the zero case (enabled case still omits `lockReason`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:js -- resources/js/lib/bullet-rewrite.test.ts resources/js/lib/gap-generate.test.ts`

Expected: FAIL — not-subscribed still returns `visible: false` / missing `lockReason`.

- [ ] **Step 3: Implement minimal helper change**

In `bullet-rewrite.ts`, replace `bulletRewriteControl` with:

```ts
export type AiControlLockReason = 'subscribe' | 'credits' | 'blocked';

export function bulletRewriteControl(credits: BulletRewriteCredits | null): {
    visible: boolean;
    disabled: boolean;
    title?: string;
    label: string;
    lockReason?: AiControlLockReason;
} {
    const label = 'Rewrite · 1 credit';

    if (credits === null) {
        return { visible: false, disabled: true, label };
    }

    if (!credits.subscribed) {
        return {
            visible: true,
            disabled: true,
            title: 'Subscribe to unlock',
            label,
            lockReason: 'subscribe',
        };
    }

    if (!credits.canPurchase) {
        return {
            visible: true,
            disabled: true,
            label,
            lockReason: 'blocked',
        };
    }

    if (credits.balance < 1) {
        return {
            visible: true,
            disabled: true,
            title: 'Out of AI credits',
            label,
            lockReason: 'credits',
        };
    }

    return { visible: true, disabled: false, label };
}
```

`gapGenerateControl` already spreads the control and overrides `label` — no logic change required there for this task.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:js -- resources/js/lib/bullet-rewrite.test.ts resources/js/lib/gap-generate.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/js/lib/bullet-rewrite.ts resources/js/lib/bullet-rewrite.test.ts resources/js/lib/gap-generate.test.ts
git commit -m "Show locked AI controls when user is not subscribed"
```

---

### Task 2: Checkout href + click resolver

**Files:**
- Modify: `resources/js/lib/gap-generate.ts`
- Modify: `resources/js/lib/gap-generate.test.ts`

**Interfaces:**
- Consumes: Ziggy global `route`, Task 1 `lockReason`
- Produces:

```ts
export function subscriptionCheckoutHref(): string | null;

export type AiControlClick =
    | { type: 'run' }
    | { type: 'navigate'; href: string }
    | { type: 'noop' };

export function resolveAiControlClick(
    control: {
        visible: boolean;
        disabled: boolean;
        lockReason?: 'subscribe' | 'credits' | 'blocked';
    },
    checkoutHref: string | null,
): AiControlClick;
```

- [ ] **Step 1: Write the failing tests**

Append to `gap-generate.test.ts`:

```ts
import {
    // existing imports…
    resolveAiControlClick,
    subscriptionCheckoutHref,
} from './gap-generate';

describe('resolveAiControlClick', () => {
    const lockedSubscribe = gapGenerateControl({
        balance: 0,
        subscribed: false,
        canPurchase: false,
    });

    it('navigates to checkout when lockReason is subscribe and href exists', () => {
        expect(resolveAiControlClick(lockedSubscribe, '/billing/checkout')).toEqual({
            type: 'navigate',
            href: '/billing/checkout',
        });
    });

    it('noops subscribe lock when checkout href is missing', () => {
        expect(resolveAiControlClick(lockedSubscribe, null)).toEqual({
            type: 'noop',
        });
    });

    it('noops when credits-locked or blocked', () => {
        expect(
            resolveAiControlClick(
                gapGenerateControl({
                    balance: 0,
                    subscribed: true,
                    canPurchase: true,
                }),
                '/billing/checkout',
            ),
        ).toEqual({ type: 'noop' });

        expect(
            resolveAiControlClick(
                gapGenerateControl({
                    balance: 5,
                    subscribed: true,
                    canPurchase: false,
                }),
                '/billing/checkout',
            ),
        ).toEqual({ type: 'noop' });
    });

    it('runs when enabled', () => {
        expect(
            resolveAiControlClick(
                gapGenerateControl({
                    balance: 2,
                    subscribed: true,
                    canPurchase: true,
                }),
                '/billing/checkout',
            ),
        ).toEqual({ type: 'run' });
    });
});

describe('subscriptionCheckoutHref', () => {
    it('returns null when route() is unavailable in this environment', () => {
        // Vitest has no Ziggy route global by default.
        expect(subscriptionCheckoutHref()).toBeNull();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:js -- resources/js/lib/gap-generate.test.ts`

Expected: FAIL — `resolveAiControlClick` / `subscriptionCheckoutHref` not exported.

- [ ] **Step 3: Implement helpers**

Add to `gap-generate.ts` (mirror `creditsPurchaseHref` style):

```ts
export function subscriptionCheckoutHref(): string | null {
    if (typeof route !== 'function') {
        return null;
    }

    try {
        const ziggy = route();

        if (typeof ziggy.has === 'function' && ziggy.has('billing.checkout')) {
            return route('billing.checkout');
        }
    } catch {
        return null;
    }

    return null;
}

export type AiControlClick =
    | { type: 'run' }
    | { type: 'navigate'; href: string }
    | { type: 'noop' };

export function resolveAiControlClick(
    control: {
        visible: boolean;
        disabled: boolean;
        lockReason?: 'subscribe' | 'credits' | 'blocked';
    },
    checkoutHref: string | null,
): AiControlClick {
    if (!control.visible) {
        return { type: 'noop' };
    }

    if (control.lockReason === 'subscribe') {
        return checkoutHref
            ? { type: 'navigate', href: checkoutHref }
            : { type: 'noop' };
    }

    if (control.disabled) {
        return { type: 'noop' };
    }

    return { type: 'run' };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:js -- resources/js/lib/gap-generate.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/js/lib/gap-generate.ts resources/js/lib/gap-generate.test.ts
git commit -m "Route locked AI subscribe clicks to billing checkout"
```

---

### Task 3: Wire all three Workstation surfaces

**Files:**
- Modify: `resources/js/Components/workstation/bullets-editor.tsx`
- Modify: `resources/js/Components/workstation/inspector-sections.tsx`
- Modify: `resources/js/Components/workstation/optimize-panel.tsx`

**Interfaces:**
- Consumes: Task 1 `lockReason`; Task 2 `subscriptionCheckoutHref`, `resolveAiControlClick`
- Produces: UI that shows locked controls for unsubscribed users; click navigates; no AI POST on that path

**Click rule (all three):** never put HTML `disabled` on a subscribe-locked control. `Button` uses `disabled:pointer-events-none`. Prefer `<a href={…} className={buttonClassName('outline', 'sm')}>` for outline buttons, and a `locked` visual path for the local `ToolbarButton`.

- [ ] **Step 1: Wire `bullets-editor.tsx`**

Imports: add `resolveAiControlClick`, `subscriptionCheckoutHref` from `@/lib/gap-generate`.

Extend local `ToolbarButton` props with optional `locked?: boolean`. When `locked`, apply the same opacity/cursor classes as `disabled`, but **do not** early-return in `onClick`.

Rewrite control usage:

```tsx
const rewriteControl = bulletRewriteControl(aiCredits);
const checkoutHref = subscriptionCheckoutHref();

// inside toolbar render:
{rewriteControl.visible && (
    <ToolbarButton
        label={rewriteControl.label}
        title={rewriteControl.title}
        active={false}
        locked={rewriteControl.lockReason === 'subscribe'}
        disabled={
            rewriteControl.lockReason === 'subscribe'
                ? false
                : rewriteControl.disabled || rewrite.status === 'loading'
        }
        onClick={() => {
            const decision = resolveAiControlClick(
                rewriteControl,
                checkoutHref,
            );

            if (decision.type === 'navigate') {
                window.location.assign(decision.href);
                return;
            }

            if (decision.type === 'run') {
                void requestRewrite();
            }
        }}
    >
        <SparklesIcon className="size-3.5" />
        <span className="whitespace-nowrap">{rewriteControl.label}</span>
    </ToolbarButton>
)}
```

Keep `requestRewrite()`’s early `if (rewriteControl.disabled) return` — subscribe-lock never reaches it when the click handler navigates first; if somehow called, disabled still blocks the POST.

- [ ] **Step 2: Wire `inspector-sections.tsx` (summary Rewrite)**

Import `buttonClassName` from `@/Components/ui/button`, plus `resolveAiControlClick`, `subscriptionCheckoutHref`.

```tsx
const rewriteControl = bulletRewriteControl(aiCredits);
const checkoutHref = subscriptionCheckoutHref();
const subscribeLock =
    rewriteControl.lockReason === 'subscribe' && checkoutHref !== null;

// in the summary header:
{rewriteControl.visible &&
    (subscribeLock ? (
        <a
            href={checkoutHref}
            title={rewriteControl.title}
            className={buttonClassName('outline', 'sm')}
        >
            <SparklesIcon className="size-3.5" />
            {rewriteControl.label}
        </a>
    ) : (
        <Button
            type="button"
            size="sm"
            variant="outline"
            title={rewriteControl.title}
            disabled={
                rewriteControl.disabled ||
                rewrite.status === 'loading' ||
                summary.trim() === ''
            }
            onClick={() => void requestRewrite()}
        >
            <SparklesIcon className="size-3.5" />
            {rewriteControl.label}
        </Button>
    ))}
```

Empty summary: subscribe-lock still shows the link (discovery); enabled path stays disabled when summary is blank.

- [ ] **Step 3: Wire `optimize-panel.tsx` (Generate)**

Import `buttonClassName`, `resolveAiControlClick`, `subscriptionCheckoutHref` (already imports `creditsPurchaseHref` / `gapGenerateControl` from the same module — extend that import).

```tsx
const generateControl = gapGenerateControl(aiCredits);
const purchaseHref = creditsPurchaseHref();
const checkoutHref = subscriptionCheckoutHref();
const subscribeLock =
    generateControl.lockReason === 'subscribe' && checkoutHref !== null;
```

For each missing-keyword Generate control:

```tsx
{generateControl.visible &&
    (subscribeLock ? (
        <a
            href={checkoutHref}
            title={generateTitle}
            className={buttonClassName('outline', 'sm')}
        >
            <SparklesIcon className="size-3.5" />
            {generateControl.label}
        </a>
    ) : (
        <Button
            type="button"
            size="sm"
            variant="outline"
            title={generateTitle}
            disabled={generateDisabled}
            onClick={() => void requestGenerate(term)}
        >
            <SparklesIcon className="size-3.5" />
            {generateControl.label}
        </Button>
    ))}
```

Keep the existing separate **Buy credits** link for `lockReason === 'credits'` / title `Out of AI credits`. Do **not** add a Subscribe link beside the experience picker — the Generate control itself is the CTA.

Optional hardening inside `requestGenerate`: leave the existing `if (generateDisabled) return` — subscribe-lock uses `<a>`, so it never calls `requestGenerate`.

- [ ] **Step 4: Run JS unit tests**

Run: `npm run test:js -- resources/js/lib/bullet-rewrite.test.ts resources/js/lib/gap-generate.test.ts`

Expected: PASS.

- [ ] **Step 5: Manual browser check (required before claiming done)**

1. Log in as a user with **no** Cashier `default` subscription (`aiCredits.subscribed === false`).
2. Open Workstation Edit: locked Rewrite appears on a bullet toolbar and on Summary (`title` Subscribe to unlock; label still `· 1 credit`).
3. Click either locked Rewrite → lands on Stripe Checkout (or app redirect into Checkout), **no** network POST to `/ai/rewrite-bullet` or `/ai/rewrite-summary`.
4. Open Optimize with a JD that has missing terms: locked Generate appears; click → same checkout path; no POST to gap-generate.
5. Spot-check a **subscribed** user with balance ≥ 1: controls enabled, generate/rewrite still work.
6. Spot-check subscribed balance 0: still “Out of AI credits” + Buy link behavior unchanged.
7. Spot-check `ai_blocked` if easy: locked, no Subscribe/Buy.

If Vite HMR is stale, run `npm run build` or ensure `composer run dev` / `npm run dev` is live.

- [ ] **Step 6: Commit**

```bash
git add \
  resources/js/Components/workstation/bullets-editor.tsx \
  resources/js/Components/workstation/inspector-sections.tsx \
  resources/js/Components/workstation/optimize-panel.tsx
git commit -m "Wire locked AI controls to Subscribe checkout"
```

---

### Task 4: Parent-spec supersession note

**Files:**
- Modify: `docs/superpowers/specs/2026-09-10-workstation-ai-credits-design.md` (the §3 “Not subscribed — hide on Edit…” bullet only)

**Interfaces:**
- Consumes: discovery design decision
- Produces: parent doc no longer contradicts Approach A

- [ ] **Step 1: Edit the hide bullet**

Find:

```markdown
1. **Not subscribed** — hide on Edit; optional quiet upsell on Optimize.
```

Replace with:

```markdown
1. **Not subscribed** — show locked generative controls in place; click → Subscribe checkout (`billing.checkout`). (Superseded 2026-09-10 by `docs/superpowers/specs/2026-09-10-ai-feature-discovery-unsubscribed-design.md`; Approach A.)
```

Do not rewrite other parent sections.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-09-10-workstation-ai-credits-design.md
git commit -m "Note AI discovery supersedes hide-when-unsubscribed"
```

---

## Self-review

**Spec coverage**

| Spec requirement | Task |
| --- | --- |
| Not subscribed → visible + locked | Task 1 |
| Click → `billing.checkout` | Tasks 2–3 |
| Three surfaces (bullet, summary, generate) | Task 3 |
| Subscribed + balance ≥ 1 unchanged | Task 1 (enabled case) + Task 3 manual |
| Subscribed balance 0 Buy path unchanged | Task 1 `credits` + Task 3 keep Buy link |
| `ai_blocked` no Subscribe/Buy CTA | Task 1 `blocked` + Task 3 (no subscribe `<a>`) |
| Cost labels kept | Task 1 labels unchanged |
| Short unlock hint | Task 1 title `Subscribe to unlock` |
| Non-goals (header chip, promo, packs) | Not in any task |
| Parent §3 supersession | Task 4 |
| Unit tests for control matrix | Tasks 1–2 |
| Browser verification | Task 3 Step 5 |

**Placeholder scan:** none.

**Type consistency:** `lockReason: 'subscribe' | 'credits' | 'blocked'` is shared; `resolveAiControlClick` and all three callers use that field; `subscriptionCheckoutHref` returns `string | null` like `creditsPurchaseHref`.
