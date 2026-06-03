# Word Doc Download — Public Resume View

**Date:** 2026-06-03
**Status:** Approved

## Summary

Add a "Download Word" button to the public resume view (`/r/{token}`) that generates and streams a clean, editable `.docx` file from the resume's structured JSON data. Mirrors the existing PDF download pattern.

## Approach

Use `phpoffice/phpword` (Option A) — the standard PHP .docx generation library. Gives full programmatic control over document structure with no fragile OOXML templating and no external API dependency.

## Architecture

### New route

```
GET /r/{token}/docx   →   PublicResumeController@downloadDocx   (name: public.docx)
```

No auth required. Token-gated like all other `/r/{token}` routes.

### Backend — `PublicResumeController@downloadDocx`

1. Resolve the resume via the share token (same as `show` and `downloadPdf`).
2. Instantiate a `PhpOffice\PhpWord\PhpWord` object.
3. Build one section with the following structure:
   - **Contact name** — large bold heading (Heading 1 style)
   - **Contact details** — plain paragraph (email · phone · location · linkedin · website, pipe-separated, only non-empty fields)
   - For each populated section — **Section heading** (Heading 2 style), then content:
     - **Summary** — plain paragraph
     - **Experience** — per entry: title (bold) + company/dates sub-line (italic) + bullets as a proper Word numbered/bulleted list
     - **Education** — per entry: school (bold) + degree/field sub-line + grad year
     - **Skills** — comma-separated paragraph
     - **Certifications** — per entry: name (bold) + issuer/date sub-line
4. Log a `docx_download` event to `resume_share_events` wrapped in try/catch (same pattern as `pdf_download`).
5. Return the file via `IOFactory::createWriter($phpWord, 'Word2007')->save('php://output')` with headers:
   - `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`
   - `Content-Disposition: attachment; filename="<resume-name>.docx"`

### Frontend — `PublicView.tsx`

Add a "Download Word" button in the existing top-right action bar (currently only holds "Download PDF"). The two buttons sit side-by-side:

- **Download Word** — white background, indigo border, indigo text (outline style)
- **Download PDF** — solid indigo (existing style, unchanged)

Both are plain `<a>` tags — no JS, no Inertia form.

```tsx
<a href={route('public.docx', token)}
   className="rounded-md border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 shadow-sm hover:bg-indigo-50">
    Download Word
</a>
```

## Dependencies

```bash
composer require phpoffice/phpword
```

One new package. No config changes, no migrations, no new env vars.

## Analytics

`docx_download` is a new event type logged to `resume_share_events`. The existing `AnalyticsController` aggregates by `event_type`; no schema change needed — the new event type appears automatically in any raw queries.

## Out of scope

- No attempt to replicate the resume's visual template (colors, fonts, layout) in the .docx
- No Word download from the authenticated editor (builder) — public view only
- No admin-side tracking of docx vs pdf split (can be added later if needed)
