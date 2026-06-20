Recently edited
app/Models/User.php (edited 1x)
app/Services/UserLimits.php (edited 1x)
resources/js/Pages/Admin/Ai/Charts.tsx (edited 1x)
database/migrations/2026_06_16_202652_add_registration_ip_to_users_table.php (edited 1x)
tests/Feature/Auth/RegistrationTest.php (edited 1x)
tests/Feature/Auth/EmailVerificationTest.php (edited 1x)
tests/Feature/AiSuggestionTest.php (edited 1x)
app/Data/AiPrompts.php (edited 1x)
Decisions
Interview Coach feature: AiPrompts, UserLimits, controller, route, panel, Edit.tsx wired
Memories
Interview Coach feature: AiPrompts, UserLimits, controller, route, panel, Edit.tsx wired (app/Data/AiPrompts.php)
Edited during active session (app/Http/Controllers/InterviewCoachController.php)
Edited during active session (resources/js/Pages/ResumeBuilder/Partials/InterviewCoachPanel.tsx)
Edited during active session (tests/Feature/InterviewCoachTest.php)
Edited during active session (tests/Feature/UserLimitsAiTest.php)
=== CONTEXT.md ===

Resumegen Context
Current Task
Interview Coach shipped (commit ee6c00c). Stripe webhook still pending DNS.

Key Decisions
Stripe: API keys set, all 6 price IDs confirmed. STRIPE_WEBHOOK_SECRET still placeholder — blocked on resumegen.app DNS pointing at webserver.
Interview Coach uses AiService + AiPrompts pattern (not Anthropic direct), free users get 3/month via AiRequest feature filter.
Next Steps
Stripe webhook (blocked on DNS): create endpoint at https://resumegen.app/stripe/webhook, select Cashier events (customer.subscription.created/updated/deleted, invoice.payment_succeeded, invoice.payment_failed), paste whsec_... into .env, run php artisan config:clear.
LinkedIn Import: Tasks 2–3 in docs/superpowers/plans/2026-06-06-pre-launch-feature-moat.md (backend hint param + frontend tab). Plan code uses wrong class names — adapt to real AiService/AiRequest pattern.
npm update axios vite: security patch flagged in audit scan.
Undo for AI bullet rewrite: one bad rewrite loses original text permanently. === end CONTEXT.md ===