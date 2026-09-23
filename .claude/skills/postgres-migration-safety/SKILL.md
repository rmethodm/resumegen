---
name: postgres-migration-safety
description: "Apply when writing a Laravel migration that alters a table with production data — adding NOT NULL columns, indexes, or large backfills on PostgreSQL. Covers lock avoidance and zero-downtime column changes. Complements the forward-only migration policy in this repo's CLAUDE.md (migrate:fresh only, never rollback)."
license: MIT
metadata:
  origin: ECC (https://github.com/affaan-m/ECC), Postgres section only — trimmed from Prisma/Drizzle/Django/Go noise
---

# PostgreSQL Migration Safety

This repo's migrations are forward-only (see CLAUDE.md — never `migrate:rollback`). This skill covers the other half: writing a *safe forward* migration that doesn't lock or corrupt data on a live production table.

## Core Rules

1. Never add a `NOT NULL` column without a default — full table rewrite + lock.
2. Never `CREATE INDEX` inline on an existing table with data — blocks writes. Use `CONCURRENTLY`.
3. Large data backfills are a separate migration from the schema change (DDL and DML don't mix).
4. Test against production-sized data when the table is large — 100 rows behaves nothing like 10M.

## Adding a Column

```php
// GOOD — nullable, no lock
Schema::table('users', fn (Blueprint $table) => $table->text('avatar_url')->nullable());

// GOOD — has default, Postgres 11+ is instant metadata-only change
Schema::table('users', fn (Blueprint $table) => $table->boolean('is_active')->default(true));

// BAD — NOT NULL without default locks + rewrites every row
Schema::table('users', fn (Blueprint $table) => $table->text('role'));
```

## Adding an Index Without Downtime

Laravel's `Schema::table` index creation is not concurrent by default. For a large existing table, drop to raw SQL:

```php
DB::statement('CREATE INDEX CONCURRENTLY idx_users_email ON users (email)');
```

`CONCURRENTLY` cannot run inside a transaction — Laravel migrations wrap in a transaction by default, so either disable it for this migration or run the statement outside the migration's transaction block:

```php
public $withinTransaction = false;
```

## Renaming/Removing a Column (Expand-Contract)

Never rename directly. Sequence as separate migrations + deploys:

1. Add new column (nullable)
2. Backfill data (separate migration, batched — see below)
3. Deploy app code reading/writing the new column
4. Drop old column in a later migration, after app no longer references it

This matches the pattern already used in this repo for `resume_deletions` / mobile sync — additive first, cleanup later.

## Batched Backfill (avoid locking the whole table)

```php
DB::table('users')->whereNull('normalized_email')->orderBy('id')->chunkById(10000, function ($rows) {
    foreach ($rows as $row) {
        DB::table('users')->where('id', $row->id)->update(['normalized_email' => strtolower($row->email)]);
    }
});
```

Never a single unbatched `UPDATE` on a large table in one migration — locks it for the duration.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Fix |
|---|---|---|
| `NOT NULL` without default | Locks table, rewrites every row | Nullable + default, or backfill then constrain |
| Inline `CREATE INDEX` on large table | Blocks writes during build | `CREATE INDEX CONCURRENTLY` |
| Schema + data change in one migration | Hard to isolate failure, long transaction | Separate migrations |
| Editing a migration already run in prod | Schema drift between environments | New migration instead (this repo already enforces via forward-only policy) |
| Dropping a column before removing app code references | App errors on missing column mid-deploy | Remove code first, drop column next deploy |

## Related

- This repo's CLAUDE.md "Migrations are forward-only" section — rollback policy, `drop_*` migration convention
- `laravel-best-practices` — general Eloquent/migration patterns
