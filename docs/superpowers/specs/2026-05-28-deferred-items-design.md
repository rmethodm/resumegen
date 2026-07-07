# Deferred Items Design

**Date:** 2026-05-28  
**Status:** Approved

## Scope

Three targeted improvements from the deferred backlog:

1. Dashboard → editor links
2. Welcome page redesign
3. Share link label editing in-place

---

## 1. Dashboard → Editor Links

### What
Each resume row in the analytics table on `Dashboard.tsx` becomes a clickable link to `route('builder.edit', stat.resume_id)`.

### Design
- Wrap the resume name cell content in an Inertia `<Link>` pointing to `route('builder.edit', stat.resume_id)`
- Style: `font-medium text-indigo-600 hover:text-indigo-800 hover:underline` — visually distinct but not garish
- The entire row is NOT made clickable (avoids accidental navigations from clicking stats columns); only the name cell links

### Files
| Path | Action |
|------|--------|
| `resources/js/Pages/Dashboard.tsx` | Wrap resume name `<td>` content in `<Link>` |

---

## 2. Welcome Page Redesign

### What
Replace the default Laravel welcome page (`resources/js/Pages/Welcome.tsx`) with a proper marketing page for Resumegen.

### Design (approved: centered hero + feature pills + dark pricing strip)

**Structure (top to bottom):**

1. **Nav bar** — logo left, "Log in" + "Get started free" buttons right
2. **Hero section** (light indigo gradient background):
   - "Free to start" pill badge
   - H1: "Build a resume that gets you hired"
   - Subtext: "AI-powered suggestions · Beautiful templates · Share with a link"
   - Primary CTA button → `route('register')`
3. **Feature pills** (3-column grid):
   - ✨ AI Suggestions — "Bullets, skills, summaries"
   - 🎨 8 Templates — "Classic to ATS-friendly"
   - 🔗 Share Links — "Let recruiters reach you"
4. **Dark pricing strip** (bg-slate-900):
   - "Free: 5 resumes · Pro $5/mo: Unlimited"
   - "See pricing" ghost button (scrolls to or links to billing page — for now just links to `route('register')`)

**Auth state handling:** If user is already logged in (`auth.user` truthy), CTA buttons redirect to `route('dashboard')` instead of `route('register')`. Nav shows "Go to app →" instead of login/register buttons.

### Files
| Path | Action |
|------|--------|
| `resources/js/Pages/Welcome.tsx` | Full rewrite |

---

## 3. Share Link Label Editing In-Place

### What
Users can rename a share link's label directly in the share links panel on the resume editor, without navigating away.

### Design (approved: tag icon → input + Save/✕ buttons)

**View mode:** Each share link row shows the label text + a `TagIcon` (Heroicons `tag` outline, 16×16, `text-gray-400 hover:text-gray-600`) to the right of the label. The icon is always visible (not hover-only) to ensure discoverability.

**Edit mode** (triggered by clicking the tag icon):
- Label text replaced by a text `<input>` pre-filled with the current label, auto-focused
- Save button (indigo) and ✕ cancel button appear to the right of the input
- Enter key submits; Escape cancels
- On save: `PATCH /builder/{resume}/share/{link}` with `{ label: newLabel }` — this route already exists (`share.update`)
- On success: label updates in place, row returns to view mode
- On cancel: row returns to view mode with original label unchanged
- Empty label is allowed (backend currently accepts it); no client-side validation needed

**State management:** A single `editingLinkId: string | null` state variable in the share links section of `Edit.tsx`. Only one link can be in edit mode at a time.

**Inertia call:** Use `router.patch(route('share.update', { resume: resume.id, link: linkId }), { label }, { preserveScroll: true, preserveState: true })`.

### Files
| Path | Action |
|------|--------|
| `resources/js/Pages/ResumeBuilder/Edit.tsx` | Add `editingLinkId` state + inline edit UI to share links section |

---

## Tests

No new backend tests needed — existing routes are unchanged. Frontend changes are verified by `npm run build` (TypeScript) passing.

The one backend touch (`ResumeBuilderController` analytics link) has no logic change — just a frontend link addition, no test needed.
