---
name: export-surface-parity
description: Use when adding or changing a resume-content formatting option (e.g. bullet vs. numbered vs. indented lists, section toggles, template choices) or a download/export control. Resumegen renders resumes through several independent pipelines — editor live preview, PDF export, DOCX export, the Dashboard, and the public share page — and a feature shipped on only one of them is incomplete. Trigger on "add a formatting option", "add a Download button", "add an export", or any change to how resume content is displayed or downloaded.
---

# Export/Render Surface Parity

A resume feature is not done when it works in the editor. Resumegen has multiple independent rendering and export pipelines, and each one implements its own logic for turning resume data into output.

## Steps

1. When adding a user-facing formatting or content option, identify every surface that renders that content — editor live preview, PDF export, DOCX export — and implement the option in each pipeline's code, not just the editor preview's CSS/markup.
2. When adding a control that performs a download/export action, check every surface that already offers the same action (workstation editor, Dashboard resume list, public share page) and add the control there too.
3. Keep the export set complete on every surface that offers downloads: if PDF and DOCX are both available elsewhere, a new or existing download surface (e.g. the public share page) must expose both, not a subset.
4. Before reporting the feature done, exercise it on each affected surface — view the editor preview, generate an actual PDF, and generate an actual DOCX — rather than assuming PDF/DOCX coverage from the editor preview working.

## Verify

- List the surfaces touched (editor, PDF, DOCX, dashboard, share page) and confirm the feature/control appears and behaves the same on each one you claim to have covered.
- Open a generated PDF and DOCX file directly to confirm the formatting option carried through, rather than trusting the editor preview alone.
