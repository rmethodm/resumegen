# Builder Preview-Left / Skills-in-Panel Experiment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-builder `Normal | ⭐ Experiment` toggle that flips the resume builder into a preview-left / Skills-entry-right layout, piloted with only the Skills section.

**Architecture:** Pure client-side change in one React file. Two small `render*()` helpers are extracted so the *same* Skills editor and the *same* double-buffered preview iframes can appear in either layout without duplication. A single `experiment` boolean state selects which layout renders. No new route, controller, endpoint, DB column, or dependency. Saves and preview refresh are untouched — `save()` already calls `refreshPreview()` on finish.

**Tech Stack:** React 18 + TypeScript, Inertia v2, Tailwind v3, Vite. Backend guardrail test is PHPUnit.

## Global Constraints

- Touch only `resources/js/Pages/ResumeBuilder/Edit.tsx`. No other file changes.
- No `any` — the file already uses one eslint-disabled `any` in `save()`; do not add new ones.
- No new route, controller, DB column, or npm dependency.
- Toggle state is `useState(false)`, **not persisted** — reload returns to Normal. Deliberate.
- Do not modify `save()`, `buildPayload()`, `refreshPreview()`, the update endpoint, or the preview endpoint.
- Functional components + hooks only; match existing inline-Tailwind styling and color tokens (`#4f46e5`, `#94a3b8`, `#cbd5e1`, etc.).
- Verification for client-only layout is `npm run build` (tsc typecheck + vite) plus the existing Skills backend test; there is no JS test runner in this repo — do not add one.

---

### Task 1: Extract `renderSkillsEditor()` and `renderPreviewFrames()` (no behavior change)

Pure refactor. After this task the UI must look and behave exactly as before — this is the reviewable checkpoint that the extraction is faithful.

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`
  - Skills editor JSX: opening `<DraggableSection key="skills" …>` at line 995, children at lines 996–1145, closing `</DraggableSection>` at 1146.
  - Preview iframe JSX: inside the `rightTab === 'preview'` block, lines 1222–1242 (inner double-buffered iframes at 1229–1239).
- Test (guardrail, unchanged): `tests/Feature/SkillsLayoutTest.php`

**Interfaces:**
- Produces (both defined inside the `ResumeBuilder` component, closing over existing state/refs — no parameters):
  - `renderSkillsEditor(): React.ReactNode` — returns exactly the current children of the skills `DraggableSection` (the layout picker cards, tag inputs, category/narrative editors — the verbatim span from line 996 to line 1145).
  - `renderPreviewFrames(): React.ReactNode` — returns the double-buffered iframe pair (the verbatim span currently at lines 1229–1239, the two `<iframe>` elements produced by `([0, 1] as const).map(...)`).

- [ ] **Step 1: Define `renderSkillsEditor()` above the `return` (near the other handlers, e.g. just after `save`).**

Move the **verbatim** JSX children of the skills `DraggableSection` (current lines 996–1145) into a helper. Do not alter the interior:

```tsx
// Skills editor body — rendered inside the left-form DraggableSection (Normal)
// or directly in the right panel (Experiment). Closes over all skills state.
const renderSkillsEditor = (): React.ReactNode => (
    <>
        {/* ==== verbatim: current Edit.tsx lines 996–1145 (skills DraggableSection children) ==== */}
        {/* Layout picker cards, SkillTagInput usages, skillCategories / skillNarratives editors, etc. */}
        {/* Paste the existing block here UNCHANGED. */}
    </>
);
```

- [ ] **Step 2: Point the skills section at the helper.**

Replace the skills branch body so the `DraggableSection` wrapper stays but its children come from the helper:

```tsx
if (key === 'skills') return (
    <DraggableSection key="skills" id="skills" title="Skills" open={openSections.skills} onToggle={() => { toggleSection('skills'); highlightSection('skills'); }}>
        {renderSkillsEditor()}
    </DraggableSection>
);
```

- [ ] **Step 3: Define `renderPreviewFrames()` next to `renderSkillsEditor()`.**

Move the **verbatim** iframe-pair JSX (current lines 1229–1239) into a helper:

```tsx
// Double-buffered preview iframes — rendered in the right Preview tab (Normal)
// or in the left pane (Experiment). Only one instance mounts at a time.
const renderPreviewFrames = (): React.ReactNode => (
    <>
        {([0, 1] as const).map(i => (
            <iframe
                key={i}
                ref={el => { iframeRefs.current[i] = el; }}
                src={pdfFrames[i] || undefined}
                onLoad={() => { if (i !== activePdfFrame && pdfFrames[i]) { clearTimeout(pdfSwapTimer.current); setActivePdfFrame(i); } applyHighlight(i); }}
                className="absolute inset-0 h-full w-full border-0 transition-opacity duration-150"
                style={{ opacity: i === activePdfFrame ? 1 : 0, zIndex: i === activePdfFrame ? 1 : 0 }}
                title="Resume preview"
            />
        ))}
    </>
);
```

- [ ] **Step 4: Point the Preview tab at the helper.**

Inside the `rightTab === 'preview'` block, replace the inner `([0, 1] as const).map(...)` with `{renderPreviewFrames()}`, leaving the surrounding `<div className="relative h-[72vh]">` and card chrome intact:

```tsx
<div className="relative h-[72vh]">
    {renderPreviewFrames()}
</div>
```

- [ ] **Step 5: Typecheck + build to prove the refactor compiles.**

Run: `npm run build`
Expected: PASS — `tsc` reports no errors, vite build completes. (No new `any`, no unused vars.)

- [ ] **Step 6: Run the Skills backend guardrail test — proves the save payload is untouched.**

Run: `php artisan test --compact tests/Feature/SkillsLayoutTest.php`
Expected: PASS (all skills-layout + groups save/copy assertions green).

- [ ] **Step 7: Commit.**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "Builder: extract renderSkillsEditor + renderPreviewFrames (no behavior change)"
```

---

### Task 2: Add the `experiment` toggle and the preview-left / Skills-right layout

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`
  - Add state near the other `useState` hooks (e.g. beside `rightTab` at line 529).
  - Add the toggle control in the completion-bar strip (lines 857–861).
  - Wrap the form + right-panel region (`<div className="flex flex-wrap items-start bg-[#f1f5f9]">` at line 865, closing `</div>` at line ~1436) in an `experiment ? … : …` branch.

**Interfaces:**
- Consumes from Task 1: `renderSkillsEditor()`, `renderPreviewFrames()`.
- Consumes existing: `refreshPreview()`, `pdfFrames`, `activePdfFrame`, `TEMPLATE_LABELS`, `template`, `resume.id`.
- Produces: `experiment: boolean` state + `setExperiment` (local only; nothing else depends on it).

- [ ] **Step 1: Add the `experiment` state.**

Next to the `rightTab` state (line 529):

```tsx
// Experiment layout: preview on the left, Skills entry in the right panel. Not persisted.
const [experiment, setExperiment] = useState(false);
```

- [ ] **Step 2: Add the toggle control to the completion-bar strip.**

Replace the completion-bar block (lines 857–861) so the bar and a segmented toggle share one row:

```tsx
{/* Completion bar + experiment toggle */}
<div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-2">
    <div className="max-w-[220px] flex-1 overflow-hidden rounded-full bg-[#e5e7eb]" style={{ height: 4 }}>
        <div className="h-full rounded-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] transition-all" style={{ width: `${completionScore}%` }} />
    </div>
    <div className="ml-4 inline-flex overflow-hidden rounded-lg border border-[#cbd5e1] text-xs font-bold">
        <button
            type="button"
            onClick={() => setExperiment(false)}
            className={`px-3 py-1.5 transition-colors ${!experiment ? 'bg-[#4f46e5] text-white' : 'text-[#475569] hover:bg-[#f1f5f9]'}`}
        >
            Normal
        </button>
        <button
            type="button"
            onClick={() => { setExperiment(true); refreshPreview(); }}
            className={`px-3 py-1.5 transition-colors ${experiment ? 'bg-[#4f46e5] text-white' : 'text-[#475569] hover:bg-[#f1f5f9]'}`}
        >
            ⭐ Experiment
        </button>
    </div>
</div>
```

- [ ] **Step 3: Branch the layout region.**

Immediately after `<Head title={…} />` (line 863), the region begins with `<div className="flex flex-wrap items-start bg-[#f1f5f9]">` (line 865) and ends at its matching `</div>` (line ~1436, right before the `AuthenticatedLayout` close). Wrap the whole region in `{!experiment && ( … )}` so Normal renders exactly today's markup, then add the Experiment branch directly after it:

```tsx
{!experiment && (
    <div className="flex flex-wrap items-start bg-[#f1f5f9]">
        {/* …ENTIRE existing form + <aside> right panel, UNCHANGED… */}
    </div>
)}

{experiment && (
    <div className="flex flex-wrap items-start bg-[#f1f5f9]">
        {/* ── Left: live preview ── */}
        <div className="min-h-[calc(100vh-3.5rem)] flex-1 p-4">
            <div className="overflow-hidden rounded-xl border border-[#cbd5e1] bg-white shadow-[0_4px_16px_rgba(79,70,229,0.08)]">
                <div className="flex items-center justify-between border-b border-[#f1f5f9] bg-[#f8fafc] px-3.5 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#94a3b8]">Live preview</span>
                    <span className="text-[10px] text-[#a0a0b0]">{TEMPLATE_LABELS[template] ?? template} template</span>
                </div>
                <div className="relative h-[calc(100vh-8rem)]">
                    {renderPreviewFrames()}
                </div>
            </div>
        </div>

        {/* ── Right: Skills entry ── */}
        <aside className="sticky top-0 max-h-screen w-full self-start overflow-y-auto border-l border-[#cbd5e1] bg-white md:w-[440px]" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
            <div className="border-b border-[#eeeef5] px-4 py-3">
                <span className="text-xs font-bold text-[#0f172a]">Skills</span>
            </div>
            <div className="p-4">
                {renderSkillsEditor()}
            </div>
        </aside>
    </div>
)}
```

Note: `renderPreviewFrames()` mounts in exactly one branch at a time (Normal's Preview tab OR Experiment's left pane), so `iframeRefs` never collide.

- [ ] **Step 4: Typecheck + build.**

Run: `npm run build`
Expected: PASS — `tsc` clean, vite build completes.

- [ ] **Step 5: Manual visual verification (client-only layout — no JS test runner exists).**

Start the dev server if not running (`composer run dev`), open a resume in the builder, then:
1. Default view is Normal — today's form-left / preview-tab-right UI, unchanged.
2. Click **⭐ Experiment** → left pane shows the live preview, right panel shows only the Skills editor (layout picker + tag inputs).
3. Edit a skill (blur the field) → the left preview reloads and reflects the change.
4. Click **Normal** → returns to today's UI; skill edits persisted.
5. Reload the page → returns to Normal (state not persisted, as designed).

- [ ] **Step 6: Re-run the Skills backend guardrail test.**

Run: `php artisan test --compact tests/Feature/SkillsLayoutTest.php`
Expected: PASS (unchanged — proves no backend regression).

- [ ] **Step 7: Commit.**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "Builder: add Experiment toggle (preview-left / Skills-in-panel)"
```

---

## Testing Notes

This feature is client-only layout state; the repo has no JS test runner (only `tsc` via `npm run build`), so there is no red-green unit test to write for the toggle. Verification is intentionally: `npm run build` (types compile) + `tests/Feature/SkillsLayoutTest.php` staying green (the save payload and endpoint are provably untouched) + the scripted manual check in Task 2 Step 5. This matches the spec's testing section and is flagged rather than hidden.

## Self-Review

- **Spec coverage:** Toggle (Task 2 Steps 1–2) ✓; preview-left (Task 2 Step 3 left pane) ✓; Skills-only right panel, no tab bar (Task 2 Step 3 right aside) ✓; Normal unchanged (Task 2 Step 3 `!experiment` branch) ✓; not persisted (Task 2 Step 1 `useState(false)`, verified Step 5.5) ✓; single-file scope (Global Constraints) ✓; no new route/controller/dep (Global Constraints) ✓; save/refresh reused not rebuilt (Architecture; `save()` line 651 already calls `refreshPreview()`) ✓; no-duplication via extraction (Task 1) ✓.
- **Placeholder scan:** The only `/* … */` markers are explicit "paste the existing verbatim span from lines X–Y" cut instructions for unchanged in-file JSX, with exact line numbers — not deferred work.
- **Type consistency:** `renderSkillsEditor` / `renderPreviewFrames` names and `React.ReactNode` return type match between Task 1 (definition) and Task 2 (consumption). `experiment` / `setExperiment` consistent throughout.
