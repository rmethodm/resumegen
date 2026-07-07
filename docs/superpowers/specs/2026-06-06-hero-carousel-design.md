# Hero Carousel — Design Spec
**Date:** 2026-06-06  
**Status:** Approved

## Overview

Replace the single static app-screenshot mockup in the `Welcome.tsx` hero section with a 4-slide fade carousel. Each slide is a hand-coded HTML mockup (matching the existing art style) representing a different feature of the app. Slides auto-advance every 4 seconds, pause on hover, and are navigable via dot indicators and window-toolbar tab labels.

No new dependencies. Pure React state + Tailwind CSS transitions.

---

## Slides

| # | Tab label | What it shows |
|---|-----------|---------------|
| 0 | My Resumes | Current resume editor mockup (sidebar + editor panel + PDF preview) — already exists, kept as-is |
| 1 | Cover Letters | Letter list sidebar (3 cards, one selected) + editor panel with body lines and "AI tailored" badge |
| 2 | Jobs | Job applications table: Company / Role / Status badge / Applied date, 4 rows with varied status colours |
| 3 | ATS Score | Resume content panel left + ATS panel right: conic-gradient score ring (78), keyword hit/miss list |

---

## Behaviour

- **Auto-advance:** `setInterval` at 4 000 ms; clears and restarts on manual navigation.
- **Pause on hover:** `mouseenter` on the carousel wrapper sets a `paused` ref; `mouseleave` clears it. The interval checks the ref before advancing — it does not stop/restart the timer on every hover.
- **Fade transition:** slides are absolutely-positioned, stacked. Active slide has `opacity-100 transition-opacity duration-500`; inactive slides have `opacity-0`. No translate, no layout shift.
- **Dot indicators:** 4 pill dots below the frame. Active dot is wider (`w-5`) and indigo; inactive dots are `w-1.5` grey. Clicking a dot navigates immediately and resets the auto-advance timer.
- **Window-toolbar tabs:** The browser-chrome bar already contains tab labels. The 3 existing tabs (`My Resumes`, `Cover Letters`, `Jobs`) gain a 4th (`ATS Score`). Active tab gets the existing `bg-[#eef2ff] text-[#4f46e5]` pill style; inactive tabs are grey. Clicking a tab navigates like a dot click.
- **Slide label:** A small text label below the dots shows the current slide name (e.g. "Resume Builder"). Uses `min-h` to prevent layout shift during transitions.

---

## Architecture

**File changed:** `resources/js/Pages/Welcome.tsx` only. No new files, no new components.

**State:**
```ts
const [activeSlide, setActiveSlide] = useState(0);
const pausedRef = useRef(false);
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
```

**Helper:**
```ts
function goTo(n: number) {
  setActiveSlide(((n % 4) + 4) % 4);
  // reset timer
  if (timerRef.current) clearInterval(timerRef.current);
  timerRef.current = setInterval(() => {
    if (!pausedRef.current) setActiveSlide(s => (s + 1) % 4);
  }, 4000);
}
```

**Slides data array** (defined outside the component, module scope):
```ts
const SLIDES = [
  { tab: 'My Resumes',   label: 'Resume Builder'  },
  { tab: 'Cover Letters', label: 'Cover Letters'   },
  { tab: 'Jobs',          label: 'Job Tracker'     },
  { tab: 'ATS Score',     label: 'ATS Score'       },
] as const;
```

Each slide's JSX is a named `const` (e.g. `ResumeSlide`, `CoverLetterSlide`, etc.) defined inside the `Welcome` component return or as inline JSX in the slides array — whichever keeps the diff cleanest. All slide mockups follow the exact same inline-Tailwind art style as the current mockup.

---

## Visual spec (key measurements)

- Browser frame: `max-w-4xl`, `rounded-xl`, `border border-[#e5e7eb]`, `shadow-2xl shadow-[#4f46e5]/10` — unchanged from current.
- Slides container: `relative h-48 sm:h-56` (same height as current `flex h-48 sm:h-56`).
- Each slide: `absolute inset-0` with `transition-opacity duration-500`.
- Dots row: `flex justify-center items-center gap-1.5 mt-3`.
- Active dot: `w-5 h-1.5 rounded-full bg-[#4f46e5] transition-all duration-300`.
- Inactive dot: `w-1.5 h-1.5 rounded-full bg-[#d1d5db] hover:bg-[#818cf8] cursor-pointer transition-all duration-300`.
- Slide label: `text-center text-xs font-bold text-[#4f46e5] mt-1.5 min-h-[18px]`.

---

## Cleanup

- `useEffect` returns a cleanup function that calls `clearInterval(timerRef.current)` to prevent timer leaks on unmount.
- The existing `<div className="flex h-48 bg-[#f9fafb] sm:h-56">` block is replaced by the slides container.
- The window-toolbar `<div className="flex gap-4">` is updated to map over `SLIDES` and render active/inactive tab styles based on `activeSlide`.

---

## Out of scope

- Touch/swipe gestures (no library dependency; can be added later).
- Keyboard arrow navigation.
- Server-side rendering concerns (all state is client-side, no hydration issues).
