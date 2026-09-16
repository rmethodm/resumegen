# App-wide shadcn/ui Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin all 31 Inertia page components onto shadcn/ui (stock `radix-nova`/neutral theme), replacing the legacy custom `Components/ui/*` primitives and the DESIGN.md brand token layer, without changing business logic (autosave, PDF preview sync, drag-and-drop semantics, form validation) — verified re-skin, not a rewrite.

**Architecture:** Promote the already-built, real shadcn/ui primitives from `resources/js/shadcn-demo/components/ui/*` into `resources/js/Components/ui/*` (the path `components.json`'s `ui` alias already points to). Every page then swaps its legacy markup/classes for these primitives mechanically, group by group, with a build + test + live-browser checkpoint after each group. New interactive surface (command palette, toasts, skeletons, shortcuts overlay) is added as its own late-stage task once every page has a stable primitive foundation to attach to.

**Tech Stack:** React 19, TypeScript, Inertia.js v3, Tailwind CSS v4, shadcn/ui (radix-ui primitives, `class-variance-authority`, `lucide-react` icons, `sonner` toasts, `cmdk` command palette), Vite 8.

**Spec:** `docs/superpowers/specs/2026-09-16-shadcn-conversion-design.md`

## Global Constraints

- One branch (`shadcn-conversion`), checkpoint-commit per task group, merge to `main` only after the full pass is green (spec §1).
- Theme: stock shadcn `radix-nova` style, `neutral` base color, CSS vars — already declared in `components.json`. Drop `.ui-craft/tokens.md` DESIGN.md brand tokens app-wide (spec §2).
- Tailwind stays; only the custom token layer goes (spec §2).
- Domain composite components (resume-preview, bullets-editor, workstation-format-toolbar, add-job-modal, etc.) are rebuilt on shadcn primitives internally, not replaced wholesale (spec §3).
- No change to autosave debounce timing or the Workstation PDF-preview iframe refresh logic — re-skin only (spec §4).
- Out of scope: mobile API, extension API contract, DomPDF Blade templates, Stripe/Cashier redirect pages (spec §6).
- Since this is a re-skin (no new business logic), verification per page is: existing test suite stays green + `npm run build` succeeds + live browser check — not new unit tests, unless a task adds genuinely new interactive behavior (command palette, keyboard shortcuts), which does get its own tests.

---

## Conversion ruleset (applies to every page task below)

Mechanical replacements, applied per page, in this order:

| Legacy pattern | Replace with |
|---|---|
| `<button className="...">` | `<Button variant="..." size="...">` from `@/Components/ui/button` (`variant`: `default`/`destructive`/`outline`/`secondary`/`ghost`/`link`; `size`: `default`/`sm`/`lg`/`icon`) |
| `<input className="...">` | `<Input>` from `@/Components/ui/input` — same `value`/`onChange`/`placeholder` props, drop the manual className |
| `<label className="...">` | `<Label>` from `@/Components/ui/label` |
| `<select className="...">` native dropdown | `<Select>` from `@/Components/ui/select` (native-select wrapper, same `value`/`onChange` props — not the Radix listbox variant) |
| Hand-rolled card/panel `<div className="rounded-* border ... shadow-*">` | `<Card>`/`<CardHeader>`/`<CardContent>`/`<CardFooter>` from `@/Components/ui/card` |
| Hand-rolled modal/dialog | `<Dialog>`/`<DialogContent>`/`<DialogHeader>`/`<DialogTitle>` from `@/Components/ui/dialog` (destructive confirmations use `<AlertDialog>` instead) |
| Inline error/success banners (e.g. Workstation `dragError` banner from the 2026-09-15 commit) | `<Alert variant="destructive">`/`<Alert>` from `@/Components/ui/alert`, or a `toast.error(...)`/`toast.success(...)` call if it's transient |
| Legacy `Components/ui/shell.tsx` layout wrapper | keep using it for page chrome (app shell, not a shadcn concern) unless it directly wraps a widget being replaced above |

Every page task's steps are: read the current file, apply this table, build, verify tests still green, live-browser-check, commit. This is identical mechanics per page — later tasks don't repeat the table, they reference it.

---

### Task 1: Promote shadcn primitives into `Components/ui` and retire the DESIGN.md token layer

**Files:**
- Move: `resources/js/shadcn-demo/components/ui/*.tsx` → `resources/js/Components/ui/*.tsx` (overwrite same-named legacy files after checking usages — see Step 2)
- Move: `resources/js/shadcn-demo/lib/utils.ts` → confirm `resources/js/lib/utils.ts` exists with the same `cn()` export (the `utils` alias in `components.json`); if it doesn't, create it
- Modify: every moved file's `import { cn } from '@/shadcn-demo/lib/utils'` → `import { cn } from '@/lib/utils'`
- Modify: `.ui-craft/tokens.md` — mark the DESIGN.md "Flat Design Corporativo" section superseded
- Modify: `.ui-craft/brief.md` — mark the 2026-09-08 DESIGN.md entry superseded
- Test: `npm run build` (no test framework covers pure UI primitives — build success + no TS errors is the check)

**Interfaces:**
- Consumes: nothing (first task)
- Produces (for every later task to import from `@/Components/ui/...`):
  - `Button` — `import { Button } from '@/Components/ui/button'`, props `variant?: 'default'|'destructive'|'outline'|'secondary'|'ghost'|'link'`, `size?: 'default'|'sm'|'lg'|'icon'`, `asChild?: boolean`, plus native `<button>` props
  - `Input` — `import { Input } from '@/Components/ui/input'`, native `<input>` props
  - `Select` — `import { Select } from '@/Components/ui/select'`, native `<select>` props (this is the simple native-select wrapper, not a Radix listbox)
  - `Label`, `Card`/`CardHeader`/`CardContent`/`CardFooter`, `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`, `AlertDialog`, `Alert`, `Toaster`/`toast` (from `sonner`, re-exported via `@/Components/ui/sonner`), `Command`/`CommandDialog`/`CommandInput`/`CommandList`/`CommandItem`, `Skeleton`, `Tooltip`, `Popover`, `Table`, `Avatar`, `Switch`, `RadioGroup`, `Slider`, `Accordion`, `Breadcrumb`, `ScrollArea`, `Toggle`/`ToggleGroup` — all at `@/Components/ui/<kebab-name>`, same file-per-component layout as `shadcn-demo/components/ui`

- [ ] **Step 1: List every file in both directories to find name collisions**

```bash
ls resources/js/Components/ui/ > /tmp/legacy-ui-files.txt
ls resources/js/shadcn-demo/components/ui/ > /tmp/shadcn-ui-files.txt
comm -12 /tmp/legacy-ui-files.txt /tmp/shadcn-ui-files.txt
```

Expected: a short list of colliding filenames (e.g. `shell.tsx` may or may not collide — check the actual output).

- [ ] **Step 2: For each collision, grep every current usage of the legacy component's props across `resources/js/Pages` and `resources/js/Components` before overwriting**

```bash
grep -rn "from '@/Components/ui/<colliding-name>'" resources/js/Pages resources/js/Components
```

For each usage found, note any prop the legacy component supports that the shadcn replacement (from Task 1's Interfaces list above) does not. Record these as follow-up notes on the specific page task below that touches that usage — do not silently drop functionality.

- [ ] **Step 3: Move the shadcn-demo primitives into `Components/ui`, fixing the utils import**

```bash
git mv resources/js/shadcn-demo/components/ui/*.tsx resources/js/Components/ui/
```

Then in every moved file, replace:
```ts
import { cn } from '@/shadcn-demo/lib/utils';
```
with:
```ts
import { cn } from '@/lib/utils';
```

If `resources/js/lib/utils.ts` doesn't already exist, create it with the same content as `resources/js/shadcn-demo/lib/utils.ts` (a `cn()` helper combining `clsx` + `tailwind-merge` — read that file to confirm before copying).

- [ ] **Step 4: Update `resources/js/shadcn-demo/App.tsx` and any other shadcn-demo file that imported from `@/shadcn-demo/components/ui/*` to import from `@/Components/ui/*` instead**

The demo page keeps working off the same, now-shared, component set.

- [ ] **Step 5: Mark the DESIGN.md token layer superseded**

In `.ui-craft/tokens.md`, prepend to the "Accent (from DESIGN.md)" section:
```markdown
> **Superseded 2026-09-16:** app-wide shadcn/ui conversion replaced this token
> layer with shadcn's stock `radix-nova`/neutral theme (see
> `docs/superpowers/specs/2026-09-16-shadcn-conversion-design.md`). Left here
> for history only.
```

In `.ui-craft/brief.md`, append under the 2026-09-08 DESIGN.md line:
```markdown
- **2026-09-16 — superseded.** App-wide shadcn/ui conversion replaced these tokens with shadcn's stock theme. See `docs/superpowers/specs/2026-09-16-shadcn-conversion-design.md`.
```

- [ ] **Step 6: Build and typecheck**

```bash
npm run build
```

Expected: PASS, no TypeScript errors, no missing-module errors from the import path changes.

- [ ] **Step 7: Commit**

```bash
git add resources/js/Components/ui resources/js/shadcn-demo .ui-craft
git commit -m "shadcn: promote demo primitives into Components/ui, retire DESIGN.md tokens"
```

---

### Task 2: Convert Auth pages

**Files:**
- Modify: `resources/js/Pages/Auth/Login.tsx`
- Modify: `resources/js/Pages/Auth/Register.tsx`
- Modify: `resources/js/Pages/Auth/ForgotPassword.tsx`
- Modify: `resources/js/Pages/Auth/ResetPassword.tsx`
- Modify: `resources/js/Pages/Auth/ConfirmPassword.tsx`
- Modify: `resources/js/Pages/Auth/TwoFactorChallenge.tsx`
- Modify: `resources/js/Pages/Auth/VerifyEmail.tsx`
- Modify: `resources/js/Pages/Auth/ExtensionConnect.tsx`
- Test: `tests/Feature/Auth/*.php` (existing — must stay green), `tests/Browser/*.php` Dusk tests covering login/register if present

**Interfaces:**
- Consumes: `Button`, `Input`, `Label`, `Card`/`CardHeader`/`CardContent`/`CardFooter` from Task 1
- Produces: nothing new consumed by later tasks (Auth pages are leaves)

- [ ] **Step 1: Read each of the 8 files listed above** (`Read` tool — get current markup/classes for each)

- [ ] **Step 2: Apply the conversion ruleset to each file**

Follow the table in "Conversion ruleset" above. For inputs specifically: Laravel Fortify pages render server-side validation errors via an `<InputError>`-style component already in the codebase — keep using that component as-is (it's not a styling primitive being replaced), just ensure it renders under the new `<Input>` the same way it did under the old `<input>`.

- [ ] **Step 3: Run the Auth feature tests**

```bash
php artisan test tests/Feature/Auth
```

Expected: PASS, same pass count as before this task (re-skin must not change any assertion outcome).

- [ ] **Step 4: Run Dusk for Auth flows** (per Global Constraints — Auth is a Dusk-covered group)

```bash
php artisan serve --env=dusk.local --port=8001 --no-reload &
php artisan dusk --filter=Auth
```

Expected: PASS.

- [ ] **Step 5: Live browser check**

Using the Chrome MCP tools, visit `/login`, `/register`, `/forgot-password`, `/two-factor-challenge` (if reachable in current state) with real interaction (type into fields, submit) and confirm the shadcn-styled forms behave identically to before (validation errors show, submit works, redirects work).

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Auth
git commit -m "shadcn: convert Auth pages"
```

---

### Task 3: Convert Workstation (core editor)

**Files:**
- Modify: `resources/js/Pages/Resumes/Workstation.tsx`
- Modify: every component it composes under `resources/js/Components/workstation/*` and `resources/js/Components/resume/*` (bullets-editor, workstation-format-toolbar, pdf-preview-frame, resume-preview, inspector-fields, etc.) — read the full list via `graph_neighbors` on `Workstation.tsx` first
- Test: `tests/Feature/Resumes/*.php` covering Workstation save/autosave, `tests/Browser/*.php` Dusk coverage for the Workstation

**Interfaces:**
- Consumes: `Button`, `Input`, `Label`, `Select`, `Card`, `Dialog`, `AlertDialog`, `Alert`, `Tooltip`, `Toggle`/`ToggleGroup`, `Skeleton` from Task 1
- Produces: nothing new consumed by later tasks

- [ ] **Step 1: Map the full component tree**

```
graph_neighbors(file="resources/js/Pages/Resumes/Workstation.tsx")
```

List every file this page imports from `Components/workstation/` and `Components/resume/`. This is the exhaustive file list for Step 2 — write it down before editing anything.

- [ ] **Step 2: Before touching any file, run the existing Workstation tests to capture a passing baseline**

```bash
php artisan test tests/Feature/Resumes
```

Expected: PASS. Record the pass count — Step 5 must match it exactly.

- [ ] **Step 3: Convert `Workstation.tsx` and each child component from Step 1's list, one file at a time, applying the conversion ruleset**

Specific call-outs for this group (from spec §4, do NOT touch these while re-skinning):
- The `use-autosave` hook's debounce timing and `router.put` call — leave untouched, only the surrounding JSX/classes change.
- `pdf-preview-frame`'s cache-busting/reload logic for the iframe `src` — leave untouched.
- The `dragError` banner added in the Kanban work (`onError` handler) is a Workstation-adjacent pattern to watch for elsewhere in this file too — convert any such inline banner to `<Alert variant="destructive">` per the ruleset, keep the `setTimeout` auto-clear logic as-is.

- [ ] **Step 4: Build and typecheck**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Re-run the Workstation feature tests, confirm identical pass count to Step 2**

```bash
php artisan test tests/Feature/Resumes
```

- [ ] **Step 6: Run Dusk for the Workstation** (Global Constraints — Workstation is Dusk-covered)

```bash
php artisan dusk --filter=Workstation
```

Expected: PASS.

- [ ] **Step 7: Live browser check — the highest-risk one in this plan**

Using Chrome MCP: open a real resume in the Workstation, edit a bullet (confirm autosave fires — watch the network tab for the debounced `PUT`), toggle the Review tab's PDF preview between React and DomPDF iframe (confirm the iframe still loads and cache-busts on save), drag-reorder a section, and reorder a bullet via drag. All must behave exactly as before the re-skin.

- [ ] **Step 8: Commit**

```bash
git add resources/js/Pages/Resumes/Workstation.tsx resources/js/Components/workstation resources/js/Components/resume
git commit -m "shadcn: convert Workstation editor"
```

---

### Task 4: Convert Kanban + Jobs/Stats

**Files:**
- Modify: `resources/js/Pages/Jobs/Kanban.tsx` (already partly shadcn'd per the 2026-09-15 drag-error-banner commit — finish the rest of the file)
- Modify: `resources/js/Pages/Jobs/Stats.tsx`
- Modify: `resources/js/Components/jobs/*` (add-job-modal.tsx and any other job components)
- Test: `tests/Feature/JobApplications/*.php`, existing JS tests for Kanban if any

**Interfaces:**
- Consumes: `Button`, `Card`, `Dialog`, `Alert`, `Badge` (if present in the promoted set — check Task 1's file list; if not present, use `Badge`'s absence as a note and keep the current badge markup, don't invent a new primitive outside the promoted set) from Task 1
- Produces: nothing new consumed by later tasks

- [ ] **Step 1: Read `Kanban.tsx`, `Stats.tsx`, and every file under `Components/jobs/`**

- [ ] **Step 2: Apply the conversion ruleset**, keeping the existing `dragError` `<Alert>` conversion from Task 3's call-out pattern consistent here (this file already has the hand-rolled version — convert it to the same `<Alert variant="destructive">` shape used in Task 3)

- [ ] **Step 3: Run the JobApplications feature tests**

```bash
php artisan test tests/Feature/JobApplications
```

Expected: PASS, same count as baseline.

- [ ] **Step 4: Build**

```bash
npm run build
```

- [ ] **Step 5: Live browser check** — open `/job-applications`, drag a card between columns (confirm optimistic move + revert-on-error still works), open the Add Job modal, submit it.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Jobs resources/js/Components/jobs
git commit -m "shadcn: convert Kanban and Jobs/Stats"
```

---

### Task 5: Convert Dashboard cluster (Dashboard, Resumes/Index, Resumes/Compare, Apply/Wizard, Onboarding/Wizard)

**Files:**
- Modify: `resources/js/Pages/Dashboard.tsx`
- Modify: `resources/js/Pages/Resumes/Index.tsx`
- Modify: `resources/js/Pages/Resumes/Compare.tsx`
- Modify: `resources/js/Pages/Apply/Wizard.tsx`
- Modify: `resources/js/Pages/Onboarding/Wizard.tsx`
- Modify: any `Components/dashboard/*`, `Components/apply/*`, `Components/onboarding/*` these pages compose
- Test: `tests/Feature/Dashboard*.php`, `tests/Feature/Apply*.php`, `tests/Feature/Onboarding*.php` if present

**Interfaces:**
- Consumes: `Button`, `Card`, `Dialog`, `Skeleton` (Dashboard uses Inertia `<Deferred>` — pair the deferred fallback with `<Skeleton>` instead of the current fallback markup, keeping the `fallback={<></>}` requirement from the 2026-09-15 apply-flow work in mind where it applies — don't reintroduce the falsy-fallback bug), `Progress` (if present in the promoted set; if not, keep current wizard-step-progress markup) from Task 1
- Produces: nothing new consumed by later tasks

- [ ] **Step 1: Read all 5 page files and their child components** (list child components via `graph_neighbors` per file first)

- [ ] **Step 2: Apply the conversion ruleset** to each, per the call-outs above for Dashboard's deferred props and wizard progress

- [ ] **Step 3: Run relevant feature tests**

```bash
php artisan test tests/Feature/Dashboard* tests/Feature/Apply tests/Feature/Onboarding
```

Expected: PASS, same count as baseline (run once before this task's edits to capture the baseline count, same as Task 3 Step 2 pattern).

- [ ] **Step 4: Build**

```bash
npm run build
```

- [ ] **Step 5: Live browser check** — Dashboard loads with deferred sections resolving correctly, Resumes/Index and Compare render, Apply Wizard and Onboarding Wizard step through without breaking.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Dashboard.tsx resources/js/Pages/Resumes/Index.tsx resources/js/Pages/Resumes/Compare.tsx resources/js/Pages/Apply resources/js/Pages/Onboarding resources/js/Components/dashboard resources/js/Components/apply resources/js/Components/onboarding
git commit -m "shadcn: convert Dashboard, Resumes Index/Compare, Apply and Onboarding wizards"
```

---

### Task 6: Convert Settings/Profile

**Files:**
- Modify: `resources/js/Pages/Settings/StarterProfile.tsx`
- Modify: `resources/js/Pages/Profile/Edit.tsx`
- Modify: `resources/js/Pages/Profile/Partials/*.tsx` (ApplyWizardPreferenceForm, DeleteUserForm, ExtensionTokensForm, TwoFactorForm, UpdatePasswordForm, UpdateProfileInformationForm)
- Test: `tests/Feature/Profile/*.php`, `tests/Feature/Settings/*.php`

**Interfaces:**
- Consumes: `Button`, `Input`, `Label`, `Card`, `Dialog`, `AlertDialog` (DeleteUserForm's confirmation is destructive — use `AlertDialog`, not `Dialog`), `Switch` (TwoFactorForm's toggle) from Task 1
- Produces: nothing new consumed by later tasks

- [ ] **Step 1: Read `StarterProfile.tsx`, `Profile/Edit.tsx`, and all 6 `Profile/Partials/*.tsx` files**

- [ ] **Step 2: Apply the conversion ruleset**, with `DeleteUserForm.tsx`'s existing confirmation flow specifically converted to `<AlertDialog>` (destructive-action pattern per the ruleset table) and `TwoFactorForm.tsx`'s enable/disable toggle converted to `<Switch>`

- [ ] **Step 3: Run the Profile/Settings feature tests**

```bash
php artisan test tests/Feature/Profile tests/Feature/Settings
```

Expected: PASS, same count as baseline.

- [ ] **Step 4: Build**

```bash
npm run build
```

- [ ] **Step 5: Live browser check** — `/profile`, `/settings/starter-profile`, toggle 2FA, submit a password update, exercise the delete-account `AlertDialog` up to (not including) actually deleting the account.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Settings resources/js/Pages/Profile
git commit -m "shadcn: convert Settings and Profile pages"
```

---

### Task 7: Convert Shares

**Files:**
- Modify: `resources/js/Pages/Shares/Index.tsx`
- Modify: `resources/js/Pages/Resumes/PublicShare.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/LinkPassword.tsx`
- Modify: any `Components/shares/*` the Workstation's share panel uses (check `graph_neighbors` on `Workstation.tsx`'s share-panel import from Task 3 if not already covered there — if the share panel lives inside Workstation's own tree, it was already converted in Task 3 and this task only covers the standalone pages listed above)
- Test: `tests/Feature/Shares/*.php`

**Interfaces:**
- Consumes: `Button`, `Input`, `Card`, `Table` (Shares/Index lists links with view counts — convert that list to `<Table>`) from Task 1
- Produces: nothing new consumed by later tasks

- [ ] **Step 1: Read all 3 files listed above**

- [ ] **Step 2: Apply the conversion ruleset**, converting `Shares/Index.tsx`'s link list to `<Table>`/`<TableHeader>`/`<TableBody>`/`<TableRow>`/`<TableCell>`

- [ ] **Step 3: Run the Shares feature tests**

```bash
php artisan test tests/Feature/Shares
```

Expected: PASS, same count as baseline.

- [ ] **Step 4: Build**

```bash
npm run build
```

- [ ] **Step 5: Live browser check** — `/shares`, a public `/r/{token}` link (including the email/password gate flow), `ResumeBuilder/LinkPassword` page.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Shares resources/js/Pages/Resumes/PublicShare.tsx resources/js/Pages/ResumeBuilder
git commit -m "shadcn: convert Shares pages"
```

---

### Task 8: Convert Misc (Welcome, Legal, Admin/Schedule)

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx`
- Modify: `resources/js/Pages/Legal/Privacy.tsx`
- Modify: `resources/js/Pages/Legal/Terms.tsx`
- Modify: `resources/js/Pages/Admin/Schedule.tsx`
- Test: none of these have dedicated feature tests beyond route-reachability checks (per current suite) — verify via build + browser only

**Interfaces:**
- Consumes: `Button`, `Card` from Task 1
- Produces: nothing new consumed by later tasks

- [ ] **Step 1: Read all 4 files**

- [ ] **Step 2: Apply the conversion ruleset**

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Live browser check** — `/`, `/privacy`, `/terms`, and the admin schedule page (as an authenticated admin-capable session, if reachable in current app state).

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Welcome.tsx resources/js/Pages/Legal resources/js/Pages/Admin
git commit -m "shadcn: convert Welcome, Legal, and Admin Schedule pages"
```

---

### Task 9: Add app-wide command palette

**Files:**
- Create: `resources/js/Components/command-palette.tsx`
- Modify: `resources/js/Layouts/AuthenticatedLayout.tsx` (or wherever the shared authenticated shell lives — confirm via `graph_read` before editing) to mount `<CommandPalette>` once, globally
- Test: `resources/js/Components/__tests__/command-palette.test.tsx` (new — this is new behavior, gets a real test per Global Constraints)

**Interfaces:**
- Consumes: `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandItem` from Task 1; Inertia's `router.visit` for navigation
- Produces: `CommandPalette` component, mounted globally, opened via `Cmd+K`/`Ctrl+K`

- [ ] **Step 1: Write the failing test**

```tsx
// resources/js/Components/__tests__/command-palette.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CommandPalette } from '@/Components/command-palette';

vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn() },
}));

describe('CommandPalette', () => {
    it('opens on Cmd+K and navigates on item select', async () => {
        render(<CommandPalette items={[{ label: 'Dashboard', href: '/dashboard' }]} />);

        fireEvent.keyDown(window, { key: 'k', metaKey: true });
        expect(await screen.findByPlaceholderText(/type a command/i)).toBeVisible();

        fireEvent.click(screen.getByText('Dashboard'));

        const { router } = await import('@inertiajs/react');
        expect(router.visit).toHaveBeenCalledWith('/dashboard');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run resources/js/Components/__tests__/command-palette.test.tsx
```

Expected: FAIL with "Cannot find module '@/Components/command-palette'"

- [ ] **Step 3: Write the implementation**

```tsx
// resources/js/Components/command-palette.tsx
import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    CommandDialog,
    CommandInput,
    CommandList,
    CommandItem,
} from '@/Components/ui/command';

type CommandPaletteItem = { label: string; href: string };

export function CommandPalette({ items }: { items: CommandPaletteItem[] }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                setOpen((current) => !current);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                {items.map((item) => (
                    <CommandItem
                        key={item.href}
                        onSelect={() => {
                            setOpen(false);
                            router.visit(item.href);
                        }}
                    >
                        {item.label}
                    </CommandItem>
                ))}
            </CommandList>
        </CommandDialog>
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run resources/js/Components/__tests__/command-palette.test.tsx
```

Expected: PASS

- [ ] **Step 5: Mount it in the shared authenticated layout**

Read the current shared layout file first, then add (inside the authenticated wrapper, once):

```tsx
<CommandPalette
    items={[
        { label: 'Dashboard', href: route('dashboard') },
        { label: 'Job applications', href: route('job-applications.index') },
        { label: 'Shares', href: route('shares.index') },
        { label: 'Profile', href: route('profile.edit') },
    ]}
/>
```

Adjust the route names to whatever the actual named routes are (confirm via `php artisan route:list` before finalizing this list — don't guess route names).

- [ ] **Step 6: Build**

```bash
npm run build
```

- [ ] **Step 7: Live browser check** — press Cmd+K on any authenticated page, confirm the palette opens, search filters items, selecting one navigates via Inertia (no full page reload).

- [ ] **Step 8: Commit**

```bash
git add resources/js/Components/command-palette.tsx resources/js/Components/__tests__/command-palette.test.tsx resources/js/Layouts
git commit -m "shadcn: add app-wide command palette"
```

---

### Task 10: Add sonner toasts for flash messages, skeleton loaders, and keyboard shortcuts overlay

**Files:**
- Modify: shared authenticated layout (same file as Task 9) — mount `<Toaster />` once, replace the current `flash.success`/`flash.error` banner rendering with `toast.success(...)`/`toast.error(...)` calls
- Create: `resources/js/hooks/use-flash-toasts.ts` — a small hook that watches Inertia's shared `flash` prop and fires toasts on change
- Modify: any Dashboard `<Deferred>` fallback still using non-skeleton markup (cross-check against Task 5 — if Task 5 already did this, skip; this step exists in case Task 5's live-browser-check surfaced one that was missed)
- Create: `resources/js/Components/keyboard-shortcuts-overlay.tsx` — a `?`-triggered dialog listing available shortcuts (Cmd+K for command palette, at minimum)
- Test: `resources/js/hooks/__tests__/use-flash-toasts.test.ts` (new behavior)

**Interfaces:**
- Consumes: `Toaster`, `toast` from `@/Components/ui/sonner` (Task 1); `Dialog` (Task 1) for the shortcuts overlay
- Produces: `useFlashToasts()` hook, `KeyboardShortcutsOverlay` component

- [ ] **Step 1: Write the failing test for the flash-toast hook**

```ts
// resources/js/hooks/__tests__/use-flash-toasts.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { flash: { success: 'Saved', error: null } } }),
}));

import { useFlashToasts } from '@/hooks/use-flash-toasts';

describe('useFlashToasts', () => {
    beforeEach(() => {
        toastSuccess.mockClear();
        toastError.mockClear();
    });

    it('fires a success toast when flash.success is set', () => {
        renderHook(() => useFlashToasts());
        expect(toastSuccess).toHaveBeenCalledWith('Saved');
        expect(toastError).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run resources/js/hooks/__tests__/use-flash-toasts.test.ts
```

Expected: FAIL with "Cannot find module '@/hooks/use-flash-toasts'"

- [ ] **Step 3: Write the implementation**

```ts
// resources/js/hooks/use-flash-toasts.ts
import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { toast } from 'sonner';

type FlashProps = { flash?: { success?: string | null; error?: string | null } };

export function useFlashToasts() {
    const { props } = usePage<FlashProps>();

    useEffect(() => {
        if (props.flash?.success) {
            toast.success(props.flash.success);
        }
        if (props.flash?.error) {
            toast.error(props.flash.error);
        }
    }, [props.flash?.success, props.flash?.error]);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run resources/js/hooks/__tests__/use-flash-toasts.test.ts
```

Expected: PASS

- [ ] **Step 5: Wire it into the shared authenticated layout**

Read the layout file, then call `useFlashToasts()` once at the top of the component and mount `<Toaster position="bottom-center" />` (matching the position already used in `shadcn-demo/App.tsx`) once, replacing whatever the current flash-banner JSX is (find it via `grep -rn "flash.success\|flash.error" resources/js/Layouts`).

- [ ] **Step 6: Add page/section transitions**

Spec §4 lists page/section transitions as part of the maximalist pass. Wrap
the shared layout's page outlet in a fade transition keyed on the current
Inertia URL, using Inertia's own navigation events rather than a router
wrapper library (keeps this out of the autosave/PDF-preview critical path
per the Global Constraints):

```tsx
// inside the shared authenticated layout, replacing the raw {children} outlet
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

function useTransitioningOutlet(children: React.ReactNode) {
    const { url } = usePage();
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        setVisible(false);
        const timer = window.setTimeout(() => setVisible(true), 20);
        return () => window.clearTimeout(timer);
    }, [url]);

    return (
        <div className={visible ? 'animate-in fade-in duration-150' : 'opacity-0'}>
            {children}
        </div>
    );
}
```

Use this only for the top-level page outlet, not inside Workstation's own
subtree (its internal re-renders are autosave-driven, not navigation-driven —
wrapping them would add flicker unrelated to this feature).

- [ ] **Step 7: Build the keyboard shortcuts overlay**

```tsx
// resources/js/Components/keyboard-shortcuts-overlay.tsx
import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';

const SHORTCUTS = [
    { keys: 'Cmd/Ctrl + K', description: 'Open command palette' },
    { keys: '?', description: 'Show this shortcuts overlay' },
];

export function KeyboardShortcutsOverlay() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key === '?' && !event.metaKey && !event.ctrlKey) {
                const target = event.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                    return;
                }
                setOpen(true);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Keyboard shortcuts</DialogTitle>
                </DialogHeader>
                <ul className="space-y-2 text-sm">
                    {SHORTCUTS.map((shortcut) => (
                        <li key={shortcut.keys} className="flex justify-between">
                            <span className="text-muted-foreground">{shortcut.description}</span>
                            <kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">
                                {shortcut.keys}
                            </kbd>
                        </li>
                    ))}
                </ul>
            </DialogContent>
        </Dialog>
    );
}
```

Mount `<KeyboardShortcutsOverlay />` next to `<CommandPalette>` in the shared layout from Task 9.

- [ ] **Step 8: Build**

```bash
npm run build
```

- [ ] **Step 9: Live browser check** — trigger a flash message (e.g. save a profile update) and confirm a toast appears instead of the old banner; press `?` outside any text field and confirm the shortcuts overlay opens; confirm it does NOT open while typing in a form field; navigate between two pages and confirm the fade transition plays without disrupting Workstation autosave if navigating away mid-edit.

- [ ] **Step 10: Commit**

```bash
git add resources/js/hooks/use-flash-toasts.ts resources/js/hooks/__tests__/use-flash-toasts.test.ts resources/js/Components/keyboard-shortcuts-overlay.tsx resources/js/Layouts
git commit -m "shadcn: add flash toasts and keyboard shortcuts overlay"
```

---

### Task 11: Final full-suite verification and merge

**Files:** none (verification-only task)

- [ ] **Step 1: Run the full PHP suite**

```bash
composer run test
```

Expected: PASS, same total count as `main` had before this branch started.

- [ ] **Step 2: Run the full Dusk suite**

```bash
php artisan serve --env=dusk.local --port=8001 --no-reload &
php artisan dusk
```

Expected: PASS.

- [ ] **Step 3: Run the full JS/Vitest suite**

```bash
npx vitest run
```

Expected: PASS.

- [ ] **Step 4: Run Pint on any touched PHP files**

```bash
./vendor/bin/pint --dirty
```

Expected: no violations (this branch shouldn't have touched much PHP — Blade/DomPDF templates are out of scope per spec §6).

- [ ] **Step 5: Full production build**

```bash
npm run build
```

Expected: PASS, no errors.

- [ ] **Step 6: One more live pass over the highest-risk pages** — Workstation autosave + PDF preview, Kanban drag, command palette, toasts — using Chrome MCP against real data, since this is the merge gate.

- [ ] **Step 7: Report results to the user and wait for explicit go-ahead before merging** `shadcn-conversion` into `main` — this plan does not merge or push on its own (per Global Constraints: user gates merge, and per the standing rule that push/deploy are separate, explicit steps).
