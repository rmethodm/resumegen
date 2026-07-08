# Resumegen Context

## Current Task
Paused mobile development; removed `/mobile` Expo app and mobile-only backend (API auth/resumes/cover-letters/resignation-letters/push-tokens, device-token push notifications). Kept the shared Sanctum API (activity, thread-reply) used by the Chrome extension.

## Key Decisions
- Mobile (Expo/RN) is on hold — code fully removed rather than left dormant, per user decision (2026-07-08).
- Chrome-extension-only API surface kept: `GET /api/activity`, `POST /api/threads/{id}/reply`, token issuance via `PersonalTokenController` (`/profile/tokens`).
- Deploy pipeline (separate, see [[deploy-pipeline-status]] memory) pushed to main, still no GitHub Action secrets configured.

## Next Steps
1. **Add GitHub repo secrets** `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` before the deploy pipeline's first real run.
2. **Background-check vendor pick** — user still reading BackgroundChecks.com / CRS Credit API docs on their own time.
3. If mobile resumes later, re-add `/mobile` and the removed API endpoints/models from git history (removed 2026-07-08).
