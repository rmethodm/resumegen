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
