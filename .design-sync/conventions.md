# Resumegen UI — Design Agent Conventions

## Wrapping and setup

No provider or root wrapper is required. Import components directly and render them:

```jsx
import { PrimaryButton, TextInput, Modal } from 'resumegen';

function MyScreen() {
  return (
    <div className="p-6">
      <TextInput type="email" placeholder="Enter email" />
      <PrimaryButton>Continue</PrimaryButton>
    </div>
  );
}
```

Components are self-contained — no ThemeProvider, RouterProvider, or context setup needed. The only exception: `Dropdown.Link` renders an Inertia router link; avoid it in standalone designs and use plain `<a>` tags or `<div>` items inside `Dropdown.Content` instead.

## Styling idiom — Tailwind utility classes

These components use Tailwind CSS utility classes. Use the same vocabulary for all layout glue and custom elements you build alongside the library components.

**Brand colors (exact values used throughout the system):**
| Role | Class / Value |
|---|---|
| Primary action | `bg-gradient-to-br from-[#1e293b] to-[#0f172a]` (dark navy gradient) |
| Secondary surface | `bg-white border border-[#cbd5e1]` |
| Danger / destructive | `bg-red-600 hover:bg-red-500` |
| Focus ring | `focus:ring-[#3b82f6] focus:border-[#2563eb]` |
| Body text | `text-[#0f172a]` (dark navy) |
| Muted text | `text-[#475569]` (slate) |
| Accent (tags, badges) | `bg-indigo-100 text-indigo-800` |
| Border | `border-[#cbd5e1]` or `border-gray-200` |

**Typography:** `text-sm font-medium` for labels and body; `text-xs` for metadata; `font-semibold` for headings. The page font (`Figtree`) is served by Google Fonts at runtime — the bundle does not ship it; headless or offline renders fall back to system-ui.

**Spacing:** Prefer `gap-2` / `gap-3` for element spacing, `p-4` / `p-6` for container padding, `mt-1` / `mt-2` for stacked form fields.

**Read before styling:** `styles.css` (imports `_ds_bundle.css` — all component styles) and each component's `.prompt.md` for prop API.

## Component-specific notes

**PrimaryButton / SecondaryButton / DangerButton** — pass children for button text. They accept all standard `ButtonHTMLAttributes`. Add `disabled` to show the disabled state.

**TextInput** — accepts all `InputHTMLAttributes` plus `isFocused?: boolean`. Wrap with `InputLabel` above and `InputError` below for full form field pattern.

**Modal** — always pass `show={boolean}` and `onClose`. Wrap content in `<div className="p-6">`. Use `maxWidth` prop (`'sm'|'md'|'lg'|'xl'|'2xl'`) to control dialog width.

**Dropdown** — compound component: `Dropdown > Dropdown.Trigger > <button>` + `Dropdown.Content > <items>`. Content is a white rounded panel with `py-1`; add `px-4 py-2 text-sm text-gray-700` items inside.

**BulletEditor / TagInput / SkillGroupEditor / SkillNarrativeEditor** — controlled: pass `value/tags/groups/narratives` state and an `onChange` handler. Initialize with `useState`.

**AutocompleteInput** — requires `endpoint: 'job-roles' | 'job-titles'` and a live API. In standalone designs, show it with a static `value` prop to represent the filled state.

**QRCodeDisplay** — pass a `url` string; renders a canvas QR code. Optional `size` (default 128px).

## Added 2026-08-03: shadcn-style primitives, resume-rendering, and workstation components

A second, newer component family lives alongside the original set above — these are the current product's actual UI (the resume editor and its rendered output), imported the same way from `'resumegen'`.

**Badge / Button / Card (+ CardHeader/CardTitle/CardDescription/CardContent/CardFooter) / UiCheckbox / Input / Label / Textarea** — shadcn-style primitives, a separate lineage from the original `PrimaryButton`/`TextInput`/etc. above (do not mix the two families in one composition — pick one). `Button` takes `variant` (`default | destructive | outline | secondary | ghost | link`) and `size` (`default | sm | lg | icon`); no `asChild`/Slot support — use the exported `buttonClassName(variant, size, className)` helper to style a non-button element instead of wrapping it. `UiCheckbox` is the `Checkbox` export aliased to avoid a name collision with the original `Checkbox` above — when composing, import it as `UiCheckbox`. `Card` composes with its five sub-parts as children, matching the shadcn card pattern (`CardHeader` > `CardTitle` + `CardDescription`, `CardContent`, `CardFooter`).

**ResumePreview** — renders a full resume document as a print-style sheet. Takes one `resume` prop (the whole document: contact fields, `experiences`/`projects`/`education`/`certificates`/`skills` arrays, plus `template`/`font`/`density`/`skills_layout`/`section_order`). `template` selects one of ~24 named looks (`minimal`, `modern`, `classic`, `executive`, `ats`, etc.) — each only changes the header/heading treatment, never the layout, so any template is a safe default. All resume text colors are literal hex values by design (it's a print surface that must stay legible on white in both light and dark app themes) — don't restyle it with theme tokens.

**ScoreDial / ScoreGauge** — both take a `score: number | null` (null renders a "—" empty state) and render it as a ring or half-circle gauge respectively; no CSS needed beyond what ships, pure SVG/conic-gradient.

**SuggestionList** — takes `suggestions` (array of `{message, rewrite}` objects), a `stale` boolean (dims the list during a pending recompute), and an `onApply` callback. Empty array renders a reassuring "nothing to flag" message, not a blank space.

**ShareResumeModal / SkillPickerModal** — full-screen `headlessui` Dialogs; render with `open={true}` for a filled composition (both need real prop data — `share`/`library` — to look intentional, not just `open`).

**SectionFields** — the resume editor's form-fields panel; takes the whole `resume` document, a `section` key (`'experience' | 'summary' | 'skills' | ...`), `skillLibrary`, `contactErrors: {email, phone}`, and `onChange`. Renders only the fields for the given section — pair it with a section-switcher UI you build yourself.

## Idiomatic build snippet

```jsx
import { PrimaryButton, SecondaryButton, TextInput, InputLabel, InputError, Modal } from 'resumegen';
import { useState } from 'react';

function ShareModal({ show, onClose }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  return (
    <Modal show={show} onClose={onClose} maxWidth="md">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-[#0f172a]">Share Resume</h2>
        <p className="mt-1 text-sm text-[#475569]">Invite a collaborator by email.</p>
        <div className="mt-4 flex flex-col gap-1">
          <InputLabel htmlFor="email" value="Email address" />
          <TextInput
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
          />
          {error && <InputError message={error} />}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={() => { /* submit */ }}>Send Invite</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
```
