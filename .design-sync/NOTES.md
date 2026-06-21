# Design Sync Notes

## Setup — synth-entry mode (private repo workaround)

This repo has no `dist/` and no published npm package. Three things needed to work:

1. **`--entry ./ds-entry.tsx`** — synthetic barrel exporting all 16 components; passed to the converter so it doesn't look in `node_modules/resumegen`.
2. **`"name": "resumegen"` in `package.json`** — `dts.mjs:loadDts()` walks up from `typesRoot` looking for a package.json with a `name` field. Without one it walks to filesystem root and crashes with `ENOENT: /package.json`.
3. **`componentSrcMap` in config** — no `.d.ts` files (`noEmit: true` in tsconfig), so `exportedNames()` returns empty. Populating `componentSrcMap` with all 16 names + source paths injects them into the component set regardless.

The `ds-entry.tsx` at project root is the stable synthetic barrel; keep it in sync when adding components.

## CSS — stable compiled path

Vite output has hashed filenames (`app-BA-x6MAk.css`). Compiled a dedicated stable-path CSS:

```
npx tailwindcss -i ./resources/css/app.css -o ./.design-sync/components.css --content './resources/js/Components/**/*.tsx'
```

`buildCmd` in config handles this on re-sync. The `.design-sync/components.css` file is committed (not .gitignored) so diffs show Tailwind changes.

## Known benign render warns

- **`[RENDER_THIN] ApplicationLogo`** — SVG-only component, no text content. Playwright paint detection can't measure SVG pixels. Confirmed renders correctly from screenshot.
- **`[RENDER_THIN] Modal`** — headlessui Dialog uses `position: fixed`. Measured height collapses to 0px in validation context (no viewport). Confirmed renders correctly from screenshot (full overlay visible).

These two warns are non-blocking and expected. Do not rework the previews for them.

## Re-sync checklist — when adding new components

1. Add export to `ds-entry.tsx`
2. Add `"NewComponent": "resources/js/Components/NewComponent.tsx"` to `componentSrcMap` in `.design-sync/config.json`
3. Create `.design-sync/previews/NewComponent.tsx` with at least 2 variants
4. Run: `node .ds-sync/package-build.mjs --entry ./ds-entry.tsx`
5. Run: `node .ds-sync/package-validate.mjs ./ds-bundle`
6. Run re-sync to upload

## Excluded from sync

- `NavLink` — Inertia router-coupled, no standalone use
- `ResponsiveNavLink` — same as NavLink
- `UpgradeModal` — complex Inertia-coupled modal with prop callbacks; props shape requires controller data
