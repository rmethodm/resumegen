---
name: reverting-design-doc-passes
description: Handles a repeated or failed DESIGN.md / theme application pass by diagnosing the repeat instead of re-running it, and cleanly reverting every touched file. Use when the user says "I wish to redo the DESIGN.md process", re-asks to apply a "new DESIGN.md" that has not changed, says "revert changes to before DESIGN.md process", "revert back to previous theme", or "go back one more previous version".
---

# Reverting Design-Doc Passes

A repeated "redo the DESIGN.md process" is a report that the last pass did not land. Re-running the same pass, or replying that there is nothing to do, is not an answer.

## Steps

1. Re-read `DESIGN.md` and compare it to what is already implemented. If it is byte-for-byte what you already applied, say so — but do not stop there. The repeat means something the user sees does not match; ask what specifically looks wrong (which page, which element) or what scope should be different this time, and target that.
2. Never re-run an identical pass over already-changed files. If the previous pass's edits are still sitting uncommitted in the working tree, `git status --short` and report that state before proposing anything.
3. When asked to revert, enumerate every file the design pass touched first — typically `resources/css/app.css`, `tailwind.config.js`, `resources/views/app.blade.php`, plus any component files edited in the same pass (e.g. `resources/js/Components/ui/button.tsx`, `PrimaryButton.tsx`, `SecondaryButton.tsx`). Revert all of them, not just the token files.
4. Revert to the last committed state with a single explicit checkout, then confirm clean:
   `git checkout -- <files> && git status --short <files>`
5. Leave `DESIGN.md` itself untouched — the user added it, it is not part of the applied theme. Say so in the report.
6. For "go back one more previous version", check out the same files from the prior commit and unstage them:
   `git checkout <prev-sha> -- <files> && git restore --staged <files>`
   Name the two commit SHAs (from and to) in the report so the user knows where they landed.
7. Rebuild after any revert: `npm run build`. A reverted theme that does not compile is not a revert.

## Verify

- `git status --short` shows the reverted files clean (or, for a step-back, staged-then-unstaged at the intended SHA).
- `npm run build` passes.
- `DESIGN.md` is still present and unmodified.
- The report names every file reverted and the commit it was reverted to.
