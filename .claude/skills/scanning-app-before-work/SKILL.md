---
name: scanning-app-before-work
description: Scans the current state of this app and reports what exists before making changes. Use when the user opens with "scan app", "scan the whole site", "scan current state of app", asks for a summary of key features, asks to find all code touching a specific technology, asks to redesign or audit an existing surface, asks to update md files or specs to match the app, or asks for something derivable from the app (like a landing page for it) rather than supplying the details.
---

# Scanning the App Before Work

Build a current picture of the codebase from the code itself, then act. Do not ask the user for details the app already answers.

## Steps

1. Resolve which app is meant. Several apps live under `/Users/rmethod/Herd`. If the request names no app and the working directory is ambiguous, ask which one before scanning — do not scan a guess.
2. Start with the graph tools per the project policy: call `graph_continue` with the task as the query before any grep or file reading, then `graph_read` the `recommended_files` (`file::symbol` entries read only that symbol). Obey the confidence caps.
3. For an exhaustive question ("any code that focuses on X", "all key features"), use `graph_grep_all` or `fallback_rg` rather than a capped search, and read `routes/web.php`, the controllers it names, and the matching page components under `resources/js/Pages/`.
4. Report what actually exists, separating verified findings from assumptions — "only hits are third-party `engines` blocks in `package-lock.json`; no `.nvmrc`, no `engines` in `package.json`" is a result, not a failure.
5. When the request implies producing content about the app (a landing page, a feature summary), derive the content from the routes, controllers, and pages you just read. Do not ask the user what the app does.
6. When the request is to update md files or specs, mark each doc against reality: already implemented (convert to a reference note), partially implemented (scope the doc to the remaining gap), or still unbuilt (confirm and reuse the patterns you just verified instead of inventing new ones). Note any open unknown explicitly so a later rescan can close it.
7. After edits, call `graph_register_edit(files: [...])`.

## Verify

- Every claim about what exists cites a file you read this session, not recall.
- A "nothing found" answer names the searches run and the files checked.
- Specs/docs you touched state their status against the current code, with the date of the rescan.
