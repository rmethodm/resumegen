# Resumegen Context

## Current Task
Session focused on Claude Code housekeeping: cleaned old transcripts, reduced permission prompts.

## Key Decisions
- Stripe: API keys set, all 6 price IDs confirmed. `STRIPE_WEBHOOK_SECRET` still placeholder — blocked on `resumegen.app` DNS pointing at webserver.
- Interview Coach uses `AiService` + `AiPrompts` pattern (not Anthropic direct), free users get 3/month via `AiRequest` feature filter.

## Next Steps
- **Stripe webhook** (blocked on DNS): create endpoint at `https://resumegen.app/stripe/webhook`, select Cashier events (`customer.subscription.created/updated/deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`), paste `whsec_...` into `.env`, run `php artisan config:clear`.
- **LinkedIn Import**: Tasks 2–3 in `docs/superpowers/plans/2026-06-06-pre-launch-feature-moat.md` (backend hint param + frontend tab). Plan code uses wrong class names — adapt to real `AiService`/`AiRequest` pattern.
- **npm update axios vite**: security patch flagged in audit scan.
- **Undo for AI bullet rewrite**: one bad rewrite loses original text permanently.
