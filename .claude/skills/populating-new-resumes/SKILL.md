---
name: populating-new-resumes
description: Copies every Starter Profile section into a newly created resume, and fills every section when seeding a sample or demo resume. Use when creating a new resume, changing the resume create/intake path, debugging reports that "Starter Profile info does not show up when adding a new resume" or "starter profile information does not autofill", or building a sample/demo resume that must not be missing projects or certificates.
---

# Populating New Resumes

A new resume must carry over the whole Starter Profile, not just contact fields — and a sample resume must fill every section, not just the core ones.

## Steps

1. Enumerate the sections a resume can hold before writing any code or data. Per `CLAUDE.md`, a resume is relational: the `resumes` row plus one-to-many `experiences`, `projects`, `education`, `certificates`, `skills`. Contact fields are one part of the row, not the whole document.
2. When creating a resume from a Starter Profile, copy **every** one of those sections. Treat "only contact details carried over" as a bug, not a partial success.
3. Coalesce blank scalars before writing. `starter_profiles` scalar columns are `NOT NULL DEFAULT ''`, the update request marks them nullable, and `ConvertEmptyStringsToNull` turns a blank input into `null` — which throws and silently discards the whole save. Do `$data[$field] ??= ''` over the scalar fields (the pattern already in `StarterProfileController::update()`), rather than loosening the migration.
4. Route all writes through `App\Support\ResumeDocument::save()` so the child rows are written transactionally with the parent, instead of persisting the `resumes` row and dropping the relations.
5. When building a sample/demo resume, populate projects and certificates too — including each project's name, start date, end date, description, and highlight bullets. Do not stop at experience/education/skills.

## Verify

- Open the newly created resume and confirm each section from step 1 is present with the Starter Profile's data — a section that renders empty is a dropped field, not an empty profile.
- Confirm optional fields left blank in the Starter Profile saved as `''` and did not abort the save.
- Add or update a test that asserts a resume created from a fully populated Starter Profile has non-empty `experiences`, `projects`, `education`, `certificates`, and `skills`.
