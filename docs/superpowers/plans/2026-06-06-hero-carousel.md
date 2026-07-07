# Hero Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single static app-screenshot mockup in the Welcome page hero with a 4-slide fade carousel (Resume Builder, Cover Letters, Job Tracker, ATS Score) with dot indicators and auto-advance.

**Architecture:** All changes are confined to `resources/js/Pages/Welcome.tsx`. A `SLIDES` const array is defined at module scope; `useState` + two `useRef`s drive active slide, pause state, and timer. Slides are absolutely-positioned and crossfade via `opacity` + Tailwind `transition-opacity`. No new dependencies.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, existing Welcome.tsx

---

## File Map

| Action | File |
|--------|------|
| Modify | `resources/js/Pages/Welcome.tsx` |
| Test (existing, run to confirm no regression) | `tests/Feature/WelcomePageTest.php` |

---

### Task 1: Add SLIDES constant and carousel state

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx` (top of file, before component)

- [ ] **Step 1: Add imports and SLIDES constant**

Open `resources/js/Pages/Welcome.tsx`. After the existing imports (lines 1-2), add:

```tsx
import { useEffect, useRef, useState } from 'react';
```

Then, directly above the `export default function Welcome` line, add:

```tsx
const SLIDES = [
    { tab: 'My Resumes',    label: 'Resume Builder' },
    { tab: 'Cover Letters', label: 'Cover Letters'  },
    { tab: 'Jobs',          label: 'Job Tracker'    },
    { tab: 'ATS Score',     label: 'ATS Score'      },
] as const;
```

- [ ] **Step 2: Add state and refs inside the component**

Inside `Welcome`, directly after the `const isLoggedIn` line, add:

```tsx
const [activeSlide, setActiveSlide] = useState(0);
const pausedRef = useRef(false);
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

function goTo(n: number) {
    const next = ((n % SLIDES.length) + SLIDES.length) % SLIDES.length;
    setActiveSlide(next);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
        if (!pausedRef.current) setActiveSlide(s => (s + 1) % SLIDES.length);
    }, 4000);
}
```

- [ ] **Step 3: Verify the file still compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Welcome.tsx
git commit -m "feat: add carousel state and SLIDES constant to Welcome"
```

---

### Task 2: Make window-toolbar tabs dynamic

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx` (window toolbar section, ~lines 104–116)

- [ ] **Step 1: Replace static tab markup with a dynamic map**

Find this block (inside `{/* Window toolbar */}`):

```tsx
<div className="flex gap-4">
    <span className="rounded-md bg-[#eef2ff] px-3 py-1 text-xs font-bold text-[#4f46e5]">My Resumes</span>
    <span className="px-3 py-1 text-xs text-[#9ca3af]">Cover Letters</span>
    <span className="px-3 py-1 text-xs text-[#9ca3af]">Jobs</span>
</div>
```

Replace it with:

```tsx
<div className="flex gap-1">
    {SLIDES.map((slide, i) => (
        <button
            key={slide.tab}
            onClick={() => goTo(i)}
            className={
                i === activeSlide
                    ? 'rounded-md bg-[#eef2ff] px-3 py-1 text-xs font-bold text-[#4f46e5] cursor-pointer'
                    : 'px-3 py-1 text-xs text-[#9ca3af] cursor-pointer hover:text-[#6b7280] transition-colors'
            }
        >
            {slide.tab}
        </button>
    ))}
</div>
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Welcome.tsx
git commit -m "feat: make hero carousel toolbar tabs dynamic"
```

---

### Task 3: Wrap existing content in slides container and add slide 0

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx` (app body section, ~lines 117–174)

- [ ] **Step 1: Replace the app body div with a slides container**

Find this opening tag (the single slide currently):

```tsx
{/* App body */}
<div className="flex h-48 bg-[#f9fafb] sm:h-56">
```

Change it to:

```tsx
{/* Slides container */}
<div className="relative h-48 sm:h-56">
{/* Slide 0 — Resume Builder */}
<div className={`absolute inset-0 flex bg-[#f9fafb] transition-opacity duration-500 ${activeSlide === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
```

- [ ] **Step 2: Close the slide 0 div and the container div**

Find the closing tag of the app body (after the PDF preview panel closing `</div>`):

```tsx
                        </div>
                    </div>
```

The inner closing `</div>` closes `.flex h-48` — change these two closing divs to:

```tsx
                        </div>
                        {/* end slide 0 */}
                        </div>
                    </div>
```

That is: add one extra `</div>` — one closes slide 0, one closes the slides container, one closes the browser frame.

- [ ] **Step 3: Compile and visually verify slide 0 still renders**

```bash
npx tsc --noEmit
```

Then run `composer run dev` (or `npm run dev` if already running) and open `http://localhost:8000`. The hero should look identical to before — the Resume Builder mockup is visible.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Welcome.tsx
git commit -m "feat: wrap hero mockup in carousel slides container"
```

---

### Task 4: Add Cover Letters slide (slide 1)

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx` (inside slides container, after slide 0 closing div)

- [ ] **Step 1: Insert slide 1 JSX after the `{/* end slide 0 */}` comment**

```tsx
{/* Slide 1 — Cover Letters */}
<div className={`absolute inset-0 flex bg-[#f9fafb] transition-opacity duration-500 ${activeSlide === 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
    {/* Letter list sidebar */}
    <div className="w-40 flex-shrink-0 border-r border-[#f3f4f6] bg-[#fafafa] px-3 py-3 sm:w-48">
        <p className="mb-2 text-[8px] font-bold uppercase tracking-widest text-[#9ca3af]">My Cover Letters</p>
        <div className="mb-1.5 rounded-md border border-[#4f46e5] bg-[#eef2ff] px-2 py-2">
            <p className="text-[9px] font-bold text-[#4f46e5]">Google — SWE L5</p>
            <p className="text-[7px] text-[#818cf8]">Modern template</p>
        </div>
        <div className="mb-1.5 rounded-md border border-[#f3f4f6] bg-white px-2 py-2">
            <p className="text-[9px] font-bold text-[#374151]">Stripe — PM</p>
            <p className="text-[7px] text-[#9ca3af]">Standard template</p>
        </div>
        <div className="rounded-md border border-[#f3f4f6] bg-white px-2 py-2">
            <p className="text-[9px] font-bold text-[#374151]">Airbnb — Design</p>
            <p className="text-[7px] text-[#9ca3af]">Career change</p>
        </div>
    </div>
    {/* Letter editor */}
    <div className="flex-1 px-5 py-4">
        <p className="mb-3 text-[11px] font-black text-[#0f172a]">Google — Software Engineer L5</p>
        <div className="mb-1.5 h-1.5 w-full rounded-full bg-[#f3f4f6]" />
        <div className="mb-1.5 h-1.5 w-11/12 rounded-full bg-[#f3f4f6]" />
        <div className="mb-3 h-1.5 w-4/5 rounded-full bg-[#e0e7ff]" />
        <div className="mb-1.5 h-1.5 w-full rounded-full bg-[#f3f4f6]" />
        <div className="mb-1.5 h-1.5 w-10/12 rounded-full bg-[#f3f4f6]" />
        <div className="mb-1.5 h-1.5 w-3/4 rounded-full bg-[#f3f4f6]" />
        <div className="mb-3 h-1.5 w-full rounded-full bg-[#f3f4f6]" />
        <div className="mb-1 h-1.5 w-11/12 rounded-full bg-[#f3f4f6]" />
        <div className="mb-3 h-1.5 w-3/5 rounded-full bg-[#f3f4f6]" />
        <span className="inline-flex items-center gap-1 rounded-full bg-[#eef2ff] px-2 py-0.5 text-[9px] font-bold text-[#4f46e5]">
            ✦ AI tailored
        </span>
    </div>
</div>
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manually verify slide 1 appears**

In the running dev server, click "Cover Letters" in the window toolbar — the letter list + editor should appear and the Resume Builder should fade out.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Welcome.tsx
git commit -m "feat: add Cover Letters slide to hero carousel"
```

---

### Task 5: Add Job Tracker slide (slide 2)

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx` (after slide 1 closing div)

- [ ] **Step 1: Insert slide 2 JSX**

```tsx
{/* Slide 2 — Job Tracker */}
<div className={`absolute inset-0 bg-[#f9fafb] px-4 py-3 transition-opacity duration-500 ${activeSlide === 2 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
    <div className="mb-2.5 flex items-center justify-between">
        <p className="text-[11px] font-black text-[#0f172a]">Job Applications</p>
        <span className="rounded-md bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-2 py-0.5 text-[8px] font-bold text-white">+ Add job</span>
    </div>
    {/* Table header */}
    <div className="grid grid-cols-4 border-b border-[#e5e7eb] pb-1 text-[7px] font-bold uppercase tracking-widest text-[#9ca3af]">
        <span>Company</span><span>Role</span><span>Status</span><span>Applied</span>
    </div>
    {/* Row 1 */}
    <div className="grid grid-cols-4 items-center border-b border-[#f3f4f6] py-1.5 text-[8px] text-[#374151]">
        <span className="font-bold">Google</span>
        <span>Software Engineer L5</span>
        <span><span className="rounded-full bg-[#d1fae5] px-2 py-0.5 text-[7px] font-bold text-[#065f46]">Interview</span></span>
        <span>Jun 2</span>
    </div>
    {/* Row 2 */}
    <div className="grid grid-cols-4 items-center border-b border-[#f3f4f6] py-1.5 text-[8px] text-[#374151]">
        <span className="font-bold">Stripe</span>
        <span>Product Manager</span>
        <span><span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-[7px] font-bold text-[#1d4ed8]">Applied</span></span>
        <span>Jun 4</span>
    </div>
    {/* Row 3 */}
    <div className="grid grid-cols-4 items-center border-b border-[#f3f4f6] py-1.5 text-[8px] text-[#374151]">
        <span className="font-bold">Airbnb</span>
        <span>Staff Designer</span>
        <span><span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[7px] font-bold text-[#92400e]">Offer</span></span>
        <span>May 28</span>
    </div>
    {/* Row 4 */}
    <div className="grid grid-cols-4 items-center py-1.5 text-[8px] text-[#374151]">
        <span className="font-bold">Linear</span>
        <span>Frontend Engineer</span>
        <span><span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[7px] font-bold text-[#6b7280]">Saved</span></span>
        <span>—</span>
    </div>
</div>
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manually verify slide 2**

Click "Jobs" tab — job table with 4 rows and coloured status badges should appear.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Welcome.tsx
git commit -m "feat: add Job Tracker slide to hero carousel"
```

---

### Task 6: Add ATS Score slide (slide 3)

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx` (after slide 2 closing div)

- [ ] **Step 1: Insert slide 3 JSX**

```tsx
{/* Slide 3 — ATS Score */}
<div className={`absolute inset-0 flex bg-[#f9fafb] transition-opacity duration-500 ${activeSlide === 3 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
    {/* Resume content */}
    <div className="flex-1 px-5 py-4">
        <p className="text-sm font-black text-[#0f172a]">Alex Johnson</p>
        <p className="mb-3 text-xs text-[#6b7280]">Senior Product Manager</p>
        <div className="mb-1 h-1.5 w-full rounded-full bg-[#e0e7ff]" />
        <div className="mb-3 h-1.5 w-4/5 rounded-full bg-[#e0e7ff]" />
        <div className="mb-1 h-1.5 w-2/5 rounded-full bg-[#e0e7ff]" />
        <div className="mb-1 h-1.5 w-full rounded-full bg-[#f3f4f6]" />
        <div className="mb-1 h-1.5 w-3/4 rounded-full bg-[#f3f4f6]" />
        <div className="mb-1 h-1.5 w-full rounded-full bg-[#f3f4f6]" />
        <div className="mb-1 h-1.5 w-5/6 rounded-full bg-[#f3f4f6]" />
        <div className="h-1.5 w-3/5 rounded-full bg-[#f3f4f6]" />
    </div>
    {/* ATS panel */}
    <div className="w-44 flex-shrink-0 border-l border-[#f3f4f6] bg-white px-3 py-4 sm:w-52">
        {/* Score ring */}
        <div
            className="mx-auto mb-1.5 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'conic-gradient(#22c55e 0% 78%, #e5e7eb 78% 100%)' }}
        >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-[#0f172a]">
                78
            </div>
        </div>
        <p className="mb-2 text-center text-[7px] font-bold uppercase tracking-widest text-[#6b7280]">ATS Match Score</p>
        <p className="mb-1.5 text-[7px] font-bold uppercase tracking-widest text-[#9ca3af]">Keywords</p>
        {[
            { text: 'Product strategy', found: true },
            { text: 'Roadmapping',      found: true },
            { text: 'Stakeholder mgmt', found: true },
            { text: 'OKR frameworks',   found: false },
            { text: 'A/B testing',      found: false },
        ].map(kw => (
            <div key={kw.text} className="mb-1 flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${kw.found ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
                <span className={`text-[7px] ${kw.found ? 'text-[#374151]' : 'text-[#ef4444]'}`}>{kw.text}</span>
            </div>
        ))}
    </div>
</div>
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manually verify slide 3**

Click "ATS Score" tab — resume panel left, score ring + keyword list right.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Welcome.tsx
git commit -m "feat: add ATS Score slide to hero carousel"
```

---

### Task 7: Add dot indicators and slide label

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx` (after the closing `</div>` of the browser frame)

- [ ] **Step 1: Add dots and label below the browser frame**

Find the comment `{/* ── Social proof bar ──... */}` — the dots go just above it, after the browser frame's closing `</div>`.

Insert this block between the browser frame closing tag and the `{/* ── Social proof bar */}` section:

```tsx
{/* Carousel dot indicators */}
<div className="mt-4 flex items-center justify-center gap-1.5">
    {SLIDES.map((slide, i) => (
        <button
            key={slide.tab}
            onClick={() => goTo(i)}
            aria-label={`Go to ${slide.label}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeSlide
                    ? 'w-5 bg-[#4f46e5]'
                    : 'w-1.5 bg-[#d1d5db] hover:bg-[#818cf8]'
            }`}
        />
    ))}
</div>
{/* Slide label */}
<p className="mt-1.5 min-h-[18px] text-center text-xs font-bold text-[#4f46e5]">
    {SLIDES[activeSlide].label}
</p>
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manually verify dots**

In the browser: four pill dots appear below the frame; active dot is wider and indigo. Clicking a dot navigates to that slide and the label updates.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Welcome.tsx
git commit -m "feat: add carousel dot indicators and slide label"
```

---

### Task 8: Wire auto-advance timer with hover-pause and cleanup

**Files:**
- Modify: `resources/js/Pages/Welcome.tsx` (add `useEffect`, add hover handlers to carousel wrapper)

- [ ] **Step 1: Add the useEffect for auto-advance**

Inside `Welcome`, after the `goTo` function definition (before the `return`), add:

```tsx
useEffect(() => {
    timerRef.current = setInterval(() => {
        if (!pausedRef.current) setActiveSlide(s => (s + 1) % SLIDES.length);
    }, 4000);
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
}, []);
```

- [ ] **Step 2: Add hover pause to the carousel wrapper div**

Find the browser frame's outer wrapper div (the `{/* App screenshot mockup */}` div):

```tsx
<div className="relative mx-auto mt-14 max-w-4xl overflow-hidden rounded-xl border border-[#e5e7eb] shadow-2xl shadow-[#4f46e5]/10">
```

Add `onMouseEnter` and `onMouseLeave`:

```tsx
<div
    className="relative mx-auto mt-14 max-w-4xl overflow-hidden rounded-xl border border-[#e5e7eb] shadow-2xl shadow-[#4f46e5]/10"
    onMouseEnter={() => { pausedRef.current = true; }}
    onMouseLeave={() => { pausedRef.current = false; }}
>
```

- [ ] **Step 3: Final compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run existing backend tests to confirm no regressions**

```bash
php artisan test --compact tests/Feature/WelcomePageTest.php
```

Expected: 3 tests, 3 passed.

- [ ] **Step 5: Manual end-to-end verification**

In the running dev server (`http://localhost:8000`):
- Slides auto-advance every ~4 s without interaction
- Hovering the frame pauses auto-advance (watch for 10+ seconds with mouse over it — no advance)
- Moving mouse off resumes auto-advance
- Clicking any dot or tab navigates instantly and resets the 4-second timer
- All 4 slides display correct content
- Active dot/tab stays in sync throughout

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Welcome.tsx
git commit -m "feat: wire hero carousel auto-advance with hover pause"
```

---

### Task 9: Production build verification

- [ ] **Step 1: Build for production**

```bash
npm run build
```

Expected: exits 0 with no TypeScript errors. Output lands in `public/build/`.

- [ ] **Step 2: Run full test suite**

```bash
php artisan test --compact
```

Expected: all tests pass (3 WelcomePageTest + rest of suite).

- [ ] **Step 3: Final commit if build required any tweaks**

If the build was clean and tests pass with no changes, no commit needed. If any build-time fix was required, commit with `fix: resolve build issue in hero carousel`.
