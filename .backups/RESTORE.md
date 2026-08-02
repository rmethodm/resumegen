# Restore to pre-shadcn state

Snapshot taken 2026-07-21, branch `remove-ai-billing-jobsearch`, HEAD `ab57211`.

Two independent restore points:

| | Covers |
|---|---|
| `worktree-pre-shadcn.tar.gz` | the **exact working tree**, including uncommitted `composer.lock`, untracked `promptguide.md`, and both `.env` files |
| tag `pre-shadcn` (`d5fa672`) | committed state only — use for targeted, file-level rollbacks |

The tarball is the authoritative "way back". The tag is the convenient one.

## Full restore — exact state, including uncommitted work

    tar xzf .backups/worktree-pre-shadcn.tar.gz -C .
    npm ci && composer install && npm run build

Overwrites in place; does not delete files added since. To discard those too,
check `git status` first and remove them deliberately.

## Targeted restore — frontend only, committed state

    git checkout pre-shadcn -- resources/js resources/css tailwind.config.js postcss.config.js package.json package-lock.json
    npm ci && npm run build

## Do NOT use

    git checkout pre-shadcn -- .        # destroys the uncommitted composer.lock change

## Not in the archive (regenerable)

`node_modules/`, `vendor/`, `public/build/`, framework caches. Rebuild with the
commands above. `package-lock.json` and `composer.lock` are archived, so
`npm ci` / `composer install` reproduce exact versions.

## Note

The archive contains `.env` and `.env.dusk.local` — real credentials. `.backups/`
is gitignored, so it will not be committed. Do not copy it anywhere shared.

## Verify after restore

    npx tsc --noEmit && npm run build && php artisan test --compact
