# Resume Thumbnail Previews — Design

**Date:** 2026-06-14
**Status:** Approved, ready for plan

## Goal

Show real visual previews of resumes in two places, raising perceived quality
and helping users choose templates:

1. **Dashboard / resume card grid** — a thumbnail of each user's actual resume.
2. **Template picker** — a sample image of each of the 9 templates.

Generation is **server-side PDF→PNG, cached** (DomPDF already renders every
resume server-side). The two surfaces share nothing at runtime and are built as
two independent units.

## Decisions (locked)

| Question | Decision |
|---|---|
| Surfaces | Both (dashboard cards + template picker) |
| Generation | Server-side PDF→PNG via Imagick + Ghostscript, cached |
| Picker content | Static sample images (one per template), not per-user |
| Dashboard refresh | Lazy + staleness check (no queue) |

---

## Unit A — Dashboard thumbnails (per-resume, lazy + cached)

### Service: `App\Services\ResumeThumbnailGenerator`

- `generate(Resume $resume): string` — returns PNG bytes.
- Reuse `ResumeBuilderController::buildPdf($resume)->output()` to get PDF bytes
  (extract `buildPdf` into something callable from the service, or duplicate the
  one-liner `Pdf::loadView('resume-pdf', ['resume' => $resume])->setPaper('letter','portrait')`).
- Imagick pipeline: `setResolution(150,150)`, `readImageBlob($pdf)`, take page 0,
  `setImageBackgroundColor('white')` + `flattenImages()`, `thumbnailImage(400, 0)`
  (≈400px wide, height auto), `setImageFormat('png')`, `getImageBlob()`.
- Ghostscript is Imagick's PDF delegate — required at the OS level.

### Route + storage

- `GET /builder/{resume}/thumbnail` → `ResumeBuilderController@thumbnail`
  (named `builder.thumbnail`, `auth`, `authorize('update', $resume)`).
- Cache file: `storage/app/thumbnails/{resume->id}.png` (local disk).
- **Staleness:** serve the cached file unless it is missing **or**
  `resume->updated_at->getTimestamp() > filemtime(cache)`. On miss/stale,
  regenerate, write to disk, then serve.
- Response sets `Last-Modified` (= cache mtime) and `ETag` so the browser caches.
  Honor `If-Modified-Since`/`If-None-Match` → 304 when unchanged. Only *changed*
  resumes ever re-render.

### Frontend

- Resume card grid (`resources/js/Pages/Dashboard.tsx` and/or
  `resources/js/Pages/ResumeBuilder/Index.tsx` — whichever renders the cards)
  shows `<img src={route('builder.thumbnail', r.id)} loading="lazy" />` above the
  card body, with a pulsing skeleton placeholder until the image loads and an
  `onError` fallback (see Error handling).

### Cleanup

- Delete `storage/app/thumbnails/{id}.png` in the existing `Resume::booted()`
  `deleting` observer (alongside variant/snapshot cascade).

---

## Unit B — Template-picker samples (9 static images)

- `App\Data\SampleResume` — a fixed, realistic sample resume (array matching the
  `Resume` JSON shape) used only for generating template previews.
- Artisan command `thumbnails:templates` — for each of the 9 templates, render the
  sample resume in that template and write
  `public/images/templates/{template}.png`. Run at deploy time and whenever a
  template's Blade design changes.
- Generated PNGs are **committed assets** → zero runtime cost, served directly by
  the web server.
- Template picker UI swaps its current text labels for these `<img>` previews.

---

## Error handling

- If Imagick/Ghostscript is missing or a render throws: log a `Log::warning` and
  return a **template-colored placeholder** image (HTTP 200) so the dashboard
  never shows a broken image. The placeholder is a simple solid card tinted by the
  resume's `accent_color` with the resume name (small generated PNG or static SVG).
- Non-owners → 403 via `ResumePolicy@update`.

## Performance & cost

- Lazy + staleness means only changed resumes re-render; browsers cache via
  ETag/Last-Modified. A miss costs one Ghostscript spawn (~200–500ms), incurred
  async by the `<img>` request, not blocking the page render.

## Testing

- `ResumeThumbnailGenerator` returns non-empty PNG bytes for a resume
  (test skipped via `markTestSkipped` if the `imagick` extension is absent).
- Route `builder.thumbnail`:
  - 200 with `image/png` for the owner.
  - 403 for a non-owner.
  - second request serves the cache without regenerating (generator invoked once
    — assert via spy/mock or unchanged mtime).
  - regenerates after `resume->touch()` bumps `updated_at`.
  - returns the placeholder (200) when generation throws (mock the generator).
- `thumbnails:templates` command writes 9 files.

## Deploy prerequisite ⚠️

Production needs the **Imagick PHP extension + the Ghostscript binary** (`gs`).
Both are present locally. If the production host (e.g. Laravel Cloud) lacks them:
- Unit B still ships fine (committed static assets).
- Unit A falls back to **client-side pdf.js** rendering the first page to a canvas
  — same `<img>`/skeleton UX, no server tooling. Confirm host capabilities before
  implementing Unit A's server path.

## Out of scope

- Per-user content rendered in all 9 templates in the picker (expensive; static
  samples chosen instead).
- Queued pre-warming of dashboard thumbnails (lazy chosen instead).
- Multi-page thumbnails (first page only).
