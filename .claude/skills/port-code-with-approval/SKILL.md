---
name: port-code-with-approval
description: Use when porting, importing, or pulling in code/features from another project or directory into this one. Encodes the user's confirmed workflow preference for staged, approved ports instead of bulk copy-in.
---

# Porting code with per-item approval

When asked to port, import, or pull in code from another project:

1. First survey the source and produce an ordered list of the items/sections to port (files, features, or logical chunks) — do not start implementing yet.
2. Work through the list **in order**. For each item:
   - Implement or draft just that item.
   - Stop and present it to the user for explicit approval before moving to the next item.
   - If the user requests changes, revise that item and re-confirm before continuing.
3. Never bulk-implement multiple items or the whole list at once, even if the user says "pull in everything" — "everything" describes scope, not permission to skip per-item approval.
4. Flag anything in the source that conflicts with this project's existing conventions or explicit exclusions (e.g. previously-removed features) before porting it, rather than porting it silently.
