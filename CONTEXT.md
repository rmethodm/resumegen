# Context

## Current Task
ui-craft design pass finished — whole-app detector clean; token spine extended.

## Key Decisions
- Shared buttons/focus: `focus-visible` rings + semantic tokens; destructive deletes use `window.confirm` + `onConfirm`
- `surface-card` for static elevated UI; `surface-overlay` for real modals only
- Status colors dark-remapped; radii/z/shadow tokens + gray/accent ramps; legacy `brand`/`ink` frozen

## Next Steps
- Rebuild assets if needed (`npm run build` / HMR)
- Optional: commit/push this design batch
- Optional later: component-layer tokens, reduced-motion contract, per-surface finalize
