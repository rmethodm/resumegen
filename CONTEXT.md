# Resumegen Context

## Current Task
Mobile: EAS login + first production iOS build completed by user. Discussed Expo-vs-Swift-rewrite question — decided to stay on Expo.

## Key Decisions
- Stay on Expo/RN, not a Swift rewrite: shares logic with planned Android port; EAS/Apple Developer Program already covers native APIs in use (notifications, image picker, secure store, sharing).
- Cost concern resolved: EAS Build's free tier is limited, but optional — `npx expo prebuild` + local Xcode builds avoid EAS Build fees entirely; `eas submit` to TestFlight is free regardless of build method. Apple's $99/yr dev fee applies either way.
- Prior: Mobile App Phase 1 Hardening merged/pushed (`d7aeeb0`). Resume Translator feature merged `fd2a191`.
- Deploy pipeline (separate, see [[deploy-pipeline-status]] memory) pushed to main, still no GitHub Action secrets configured.

## Next Steps
1. **If pursuing local builds**: switch mobile build step to `expo prebuild` + local Xcode instead of `eas build` (offered, not started).
2. **`eas submit --platform ios --profile production --latest`** to push the completed build to TestFlight (not yet run).
3. **Add GitHub repo secrets** `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` before the deploy pipeline's first real run.
4. **Background-check vendor pick** — user still reading BackgroundChecks.com / CRS Credit API docs on their own time.
