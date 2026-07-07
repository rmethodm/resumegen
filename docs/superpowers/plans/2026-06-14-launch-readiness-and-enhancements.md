# Launch Readiness & Enhancements — 2026-06-14

Findings from a full scan: 637 tests green, CI present, no code TODOs, all specs
implemented (every "out of scope" note is an intentional deferral), 2026-06-10
audit's serious items already remediated.

## 1. Open work

**BLOCKER — Stripe tier price IDs missing from `.env`.**
`config/services.php` reads `STRIPE_STARTER_MONTHLY_PRICE_ID`, `STRIPE_PRO_*`,
`STRIPE_AGENCY_*` but `.env` only has legacy `STRIPE_MONTHLY_PRICE_ID` /
`STRIPE_YEARLY_PRICE_ID`. Paid checkout fails for every tier until the 6 IDs are
created in Stripe (live mode) and set. Config/ops task, not code.

Stale doc only (non-blocking): a memory note still says "13 / Eight templates";
CLAUDE.md is already correct at nine.

## 2. Enhancements (conversion-focused, highest ROI first)

1. Resume thumbnail previews on dashboard + template picker (currently deferred — needs headless browser).
2. Annual-plan emphasis / "2 months free" framing on billing page (pricing lever, no infra).
3. Free-tier PDF watermark ("Made with Resumegen") to convert free downloaders.
4. Social proof + sample-resume gallery on `/` and billing.
5. Mobile-responsive editor (currently deferred).

## 3. Pre-launch checklist

- [ ] Set the 6 Stripe tier price IDs in prod `.env`; run one test checkout per tier.
- [ ] Prod env: `APP_ENV=production`, `APP_DEBUG=false` (currently local/true).
- [ ] Confirm scheduler + queue worker run in prod (`revenue:snapshot`,
      `system-events:prune`, follow-up reminders, webhook delivery depend on it).
- [ ] Point Stripe webhook at prod URL with live signing secret.

Non-blocking: thumbnails, mobile editor, audit Medium items (org-role cache
invalidation, batched heatmap inserts).

**Verdict:** launch-ready once Stripe tier prices + prod env/scheduler are set;
everything else is growth polish.
