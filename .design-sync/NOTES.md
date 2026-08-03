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
- **`[RENDER_THIN] ShareResumeModal`** / **`[RENDER_THIN] SkillPickerModal`** — same root cause as Modal: both are headlessui `Dialog`s with `position: fixed`. Confirmed renders correctly from screenshot; both use the same `cardMode: single` override as Modal.

These warns are non-blocking and expected. Do not rework the previews for them.

## Don't forget: `buildCmd` is a manual pre-step, not automatic

`resync.mjs` does NOT run `cfg.buildCmd` for you — it only builds the converter bundle from whatever `.design-sync/components.css` already contains. Adding components whose styles depend on classes not previously scanned (e.g. `bg-indigo-600` for the new `Badge`) silently ships an unstyled/blank render until `buildCmd` is re-run by hand:

```
npm run build && npx tailwindcss -i ./resources/css/app.css -o ./.design-sync/components.css --content './resources/js/Components/**/*.tsx'
```

Cost this run one full rebuild+recapture cycle (Badge/Button/Input/UiCheckbox render-blank on the first pass). **Always run `buildCmd` before the first `resync.mjs`/`package-build.mjs` call of a session that touches component source or adds new components**, not just "when the DS source changed" — the CSS scan is a separate, easy-to-forget artifact from the JS bundle.

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
- `UpgradeModal` — no longer exists in the repo (billing/UpgradeModal removed 2026-07-14, confirmed via CLAUDE.md); entry kept as a documented no-op, harmless since `componentSrcMap: null` just excludes
- `SectionPanel` — calls `<Link href={route('dashboard')}>` unconditionally at render time; `route()` (Ziggy) isn't available in the design-sync bundle context, so this crashes on render
- `WorkstationHeader` — same root cause as SectionPanel: `href={route('resumes.download', ...)}` inside `<MenuItems>`, which headlessui keeps mounted (not unmounted) even while the menu is closed, so `route()` still executes during initial render

## 2026-08-03 re-sync — added 19 previously-unsynced components

Discovered `resources/js/Components/{resume,ui,workstation}/` were never wired into `ds-entry.tsx`/`componentSrcMap` (added after the last sync, part of the 2026-08-02 relational-resume rewrite). Added 15 of 19 (excluded `SectionPanel`/`WorkstationHeader` above; `NavLink`/`ResponsiveNavLink`/`UpgradeModal` were already excluded).

- **Name collision**: `ui/checkbox.tsx` also exports `Checkbox`, colliding with the existing top-level `Checkbox.tsx`. Aliased as `UiCheckbox` in `ds-entry.tsx` and `componentSrcMap`.
- **`ShareResumeModal`** calls `route()` only inside a gated `useEffect` (`if (open && share === null)`) and in event handlers — safe to include as long as its authored preview always passes a non-null `share` object when `open` is true, never triggering the create-on-open branch.
- **`SectionFields`** (from `workstation/inspector.tsx`) is the umbrella composing all seven per-section field groups (`ContactFields`, `SummaryFields`, etc. in `inspector-sections.tsx`); those sub-exports and the low-level primitives in `inspector-fields.tsx` (`Field`, `EntryCard`, ...) were deliberately left out of the barrel — internal building blocks, not something the design agent would compose with directly.
- `ResumePreview` needs a full `ResumeDraft` object as its `resume` prop — author the preview with realistic sample data covering every section, since an empty/partial draft renders mostly blank.
- **`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`** were left as floor cards (not failures) — they're `ui/card.tsx` sub-parts that only make sense composed inside `Card`, same treatment as a leaf that throws outside its provider (skill's `RadioGroup.Option` example). `Card`'s own authored preview (`.design-sync/previews/Card.tsx`) composes all five.
