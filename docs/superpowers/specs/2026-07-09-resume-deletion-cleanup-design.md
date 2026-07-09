# Resume Deletion Cleanup + Dead Master-Resume Columns

Date: 2026-07-09
Status: Approved, not yet implemented

## Problem

Two unrelated issues surfaced while correcting CLAUDE.md's cascade-delete docs.

### 1. Thumbnails leak when an account is deleted

`Resume::booted()` registers a `deleting` observer that unlinks
`storage/app/thumbnails/{id}.png`. It only runs on model-level deletes.

`ProfileController::destroy()` calls `$user->delete()`. The `resumes.user_id`
foreign key is `cascadeOnDelete`, so Postgres removes the user's resumes
directly. No model events fire. The observer never runs. Every thumbnail PNG
for that user stays on disk permanently.

This is a storage leak, and — depending on what the thumbnails render — a
data-retention problem: the user deleted their account, but images derived
from their resume content remain on the server.

### 2. The master-resume columns are dead

Migration `2026_06_08_005650_add_master_resume_fields_to_resumes_table` added
`master_resume_id`, `is_master`, and `master_synced_at`. `Resume` lists them in
`$fillable` and casts `is_master` to bool.

That is the entire implementation. There is no `masterResume()` or
`tailoredCopies()` relation, no controller reads or writes them, no UI
references them, no test covers them, and no row uses them.

CLAUDE.md design decision #4 describes the "master resume pattern" as though it
ships. It does not. The documentation is actively misleading — it caused a
design conversation about orphaned tailored copies that cannot exist.

## Decisions

### Delete resumes per-model when a user is deleted

Add a `deleting` hook on `User`:

```php
static::deleting(function (User $user): void {
    $user->resumes->each->delete();
});
```

Each resume then runs its own observer: thumbnail unlinked, A/B variants
recursed. The `cascadeOnDelete` FK stays as a backstop for any path that
bypasses the model.

This establishes the invariant that **`Resume::booted()` is the single cleanup
path for every deletion route**. Adding a new file or side-effect to a resume
means touching exactly one place.

Rejected: duplicating the unlink into a `User` hook. Cleanup would live in two
places, and the next resume-owned file would have to be added to both. That
duplication is how this bug was introduced.

Rejected for now: moving thumbnails into a medialibrary collection. Structurally
appealing — medialibrary owns its files — but its cleanup also runs on model
events, so it does not fix the FK-cascade path on its own. Separate work.

Accepted cost: deleting a user with N resumes issues N+ deletes in the request
cycle rather than one. Account deletion is rare and already performs Stripe
work. Not queued.

### Drop the master-resume columns

New migration dropping `master_resume_id`, `is_master`, `master_synced_at`.
Remove the three `$fillable` entries and the `is_master` cast. Delete design
decision #4 from CLAUDE.md.

Zero rows use these columns, so the migration is safe. It is cheap to reverse —
the original migration is in git.

If the master-resume pattern matters to the product, it earns its own brainstorm
and its own spec. Three columns left over from a migration are not a feature.

Note: `is_master_admin` on `users` is unrelated and stays.

## Testing

Both changes get tests that fail without the fix.

**Thumbnail cleanup on account deletion.** Create a user with a resume, write a
file at that resume's thumbnail path, delete the user, assert the file is gone.
This encodes *why* the hook exists — a test asserting only that resume rows
disappear would pass on the FK cascade alone and could never catch this bug.

**Column drop.** Covered by the existing suite: the migration must run clean and
`Resume::factory()` must still create. No behavior to assert, since nothing
consumed the columns.

## Out of scope

- Migrating thumbnails to medialibrary.
- Queueing account deletion.
- Building the master-resume feature.
- Moving the test suite off in-memory SQLite. `phpunit.xml` and the `sqlite`
  connection block in `config/database.php` stay as they are.

## Related, already done

`.env` and `.env.example` now both use local Postgres (`127.0.0.1:5432`,
`laravel`, `root`). `config/database.php` falls back to `pgsql` rather than
`sqlite`. Dev now matches production's engine. Tests remain on in-memory SQLite
by design.
