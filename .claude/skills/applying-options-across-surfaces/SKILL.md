---
name: applying-options-across-surfaces
description: Carries a new formatting option or action control through every rendering and export surface instead of only the editor. Use when adding a user-facing formatting choice (bullet, numbered, or indented lists; font; density; layout) to a resume section, when adding a Download or Export control, or when a report says an option "works in the editor but not in the PDF/DOCX" or a button "is missing on the Dashboard or the public share page".
---

# Applying Options Across Surfaces

A formatting option or an action control is only done when every surface that renders or offers it behaves the same.

## Steps

1. Enumerate the surfaces before writing any code. For resume content that is:
   - the editor forms (`resources/js/Pages/Resumes/Workstation.tsx` and its inspector components)
   - the React preview `resources/js/Components/resume/resume-preview.tsx` (Review tab and `Pages/Resumes/PublicShare.tsx`)
   - the server-side PDF (`App\Support\ResumeExport` + the `resumes.export.pdf` Blade template)
   - the DOCX export (`App\Support\DocxExport`)
   Write the list down and treat each entry as a required change, not an optional follow-up.
2. Persist the option on the resume document, not in component state: add the column/field and round-trip it through `App\Support\ResumeDocument::toArray()` and `save()` so every renderer above can read it.
3. Implement the option in the editor UI and then in each renderer from step 1. The React preview mirrors the PDF templates — changing one and not the other makes the preview lie about the export.
4. When adding an action control (Download, Export), replicate it on every surface that offers the same action: the Workstation header, the resume row on `Pages/Dashboard.tsx`, and the public share page. Reuse the existing control's markup and classes rather than inventing a second look.
5. On public/share surfaces, expose the full export set — both PDF and DOCX (`GET /r/{token}/pdf` and `GET /r/{token}/docx`, both gated by `allow_download`) — not just PDF.

## Verify

- Set the option in the editor, then confirm it renders correctly in the Review tab, the downloaded PDF, and the downloaded DOCX. A surface that ignores the option is an unfinished change, not a default.
- Confirm the action control appears on every surface listed in step 4, with the same styling.
- Add or update a test asserting the persisted option reaches the export path (e.g. a feature test hitting the PDF and DOCX routes for a resume with the option set).
