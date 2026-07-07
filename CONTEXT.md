# Resumegen Context

## Current Task
Mobile App Phase 1 Hardening (4 gaps from Phase 1's final review) built via subagent-driven-development, merged to `main` and pushed to `origin` (`d7aeeb0`).

## Key Decisions
- Final whole-branch review caught the foreground notification handler using Expo's deprecated `shouldShowAlert` field (should be `shouldShowBanner`/`shouldShowList` on SDK 57) — the spec/plan had drafted it from training knowledge without checking versioned docs, exactly what `mobile/AGENTS.md` warns against. Fixed and re-reviewed clean.
- The `expo-notifications` config plugin change (`mobile/app.json`) needs a native EAS rebuild before it takes effect — not part of this branch.
- Prior: Resume Translator feature (Starter+ AI translation to 7 languages) merged `fd2a191` — excludes the dead/unwired `projects` resume field; 402 response shape ambiguity resolved via `required_tier ?? next_tier ?? 'starter'` on the frontend.
- Deploy pipeline (separate earlier work, see [[deploy-pipeline-status]] memory) is pushed to main but still has no GitHub Action secrets configured.

## Next Steps
1. **Manual TestFlight verification**: real push tap opens the correct thread, and a foreground push shows a banner — no Xcode/simulator available in this sandbox.
2. **Add GitHub repo secrets** `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` before the deploy pipeline's first real run.
3. **Background-check vendor pick** — user still reading BackgroundChecks.com / CRS Credit API docs on their own time.
