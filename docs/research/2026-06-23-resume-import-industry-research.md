# Resume Import Feature — Industry Research
*Date: 2026-06-23*

> **Historical, 2026-07-21:** the resume-import feature researched here was removed along with all AI.

Deep research across Enhancv, Kickresume, OpenResume, Zety, and others on how resume builder apps handle file import.

---

## Entry Point UX

- Upload appears at **new resume creation time** — homepage hero or "start from scratch vs. import" choice
- Almost never buried inside the editor
- LinkedIn URL import offered as a second path alongside file upload (Enhancv)

---

## File Format Support

| Tool | Formats | Size Limit |
|---|---|---|
| Enhancv (consumer UI) | PDF, DOCX | 2 MB |
| Enhancv (developer API) | PDF, DOC, DOCX | 10 MB |
| Kickresume | PDF, DOCX, TXT | — |
| OpenResume | PDF only | — |
| SharpAPI | PDF, DOC, DOCX, RTF, JPG, PNG, TIFF + more | — |

**Practical minimum for a consumer tool: PDF + DOCX.**

---

## Parsing Approaches

### AI-based (Kickresume, Enhancv)
- Upload → AI extracts fields → 5–15s to complete, 10–20s end-to-end
- Enhancv uses HRFlow AI under the hood
- Kickresume: "Easily turn resumes into structured data with our powerful AI-based parsing solution"

### Deterministic / Rule-based (OpenResume)
- PDF.js text extraction → proximity-based line grouping → bold/uppercase header detection → field extraction via a point-scoring system
- Zero ML or AI involved
- Brittle on unusual layouts but fully transparent and free

---

## Extracted Field Taxonomy

Converges on 6–8 categories across all tools:

| Field | Rule-based tools | AI tools |
|---|---|---|
| Contact (name, email, phone) | ✓ | ✓ |
| Work experience (title, company, dates, bullets) | ✓ | ✓ |
| Education (institution, degree, dates) | ✓ | ✓ |
| Skills | ✓ | ✓ |
| Professional summary | — | ✓ |
| Certifications | — | ✓ |
| Languages | — | ✓ |
| Projects & achievements | — | ✓ |

---

## Universal Post-Import UX Pattern

**Original formatting is always discarded.** Extracted data is rehydrated into the app's own template and made immediately editable.

Enhancv documents this explicitly:
> "Original formatting is replaced with Enhancv's standardized styling. All sections are editable."

This is the right model — users expect to edit in the builder, not preserve their old layout.

---

## Key Accuracy Challenges

1. **Layout heterogeneity** — the #1 problem. Every resume looks different; heuristics break on edge cases.
2. **LLM-specific issues:** inconsistent terminology, non-standard date formats, OCR noise from scanned/image PDFs
3. **Rule-based issues:** brittle regex that breaks on layouts outside the training set

Academic research (ArXiv 2510.09722, Oct 2025) confirms layout heterogeneity as the dominant real-world deployment challenge.

---

## Resumegen-Specific Notes

### Dependencies already available
- `phpoffice/phpword` — already installed, covers DOCX text extraction for free
- `barryvdh/laravel-dompdf` — for generation only, not reading

### PDF extraction options to evaluate
- `smalot/pdfparser` — pure PHP, no system deps, most common Laravel choice
- `spatie/pdf-to-text` — shells out to `pdftotext` binary (better accuracy, requires system install)

### Recommended flow
1. New resume creation screen → "Import from file" option
2. User uploads PDF/DOCX/TXT
3. Backend extracts raw text via library
4. `AiService::chat()` maps text → structured JSON matching Resume model fields
5. New Resume record created, user dropped into editor pre-populated

### Resume model fields to populate
`contact`, `summary`, `experience`, `education`, `skills`, `certifications` — all already exist as JSON columns.
