# Deployment runbook — syncing the workspace to GitHub `main`

Give this to Manus as an **operations task**. It is not a licence to edit code:
every step is sync, check, migrate, or deploy. If something looks wrong, stop and
report rather than fixing it.

Context: the live site builds from the Manus-hosted workspace, not from GitHub.
That workspace currently holds the pre-rebuild application — the technical
`/pilot` page, eighteen hard-coded companions, and a room-creation call the
provider now rejects. GitHub `main` holds the corrected application. This
procedure moves one to the other.

---

## Step 0 — Confirm nothing in the workspace is unpushed

**Do not skip this.** The sync replaces workspace source with GitHub `main`.
Anything that exists only in the workspace is lost.

GitHub `main` was fast-forwarded from `18d1885`, so every commit that was on
`main` before is still an ancestor. Nothing that was pushed can be lost. The only
risk is work that was **never** pushed.

Compare the workspace against `18d1885` and report:

- Files modified, added, or deleted in the workspace but not in that commit.
- Whether any of it is worth keeping.

If the workspace is clean at `18d1885`, say so and continue. **If anything is
uncommitted, stop and report it before going further.**

## Step 1 — Check one table before migrating

Migration `0007` adds a `NOT NULL` column to `ohapi_media_jobs`. That statement
fails if the table has rows. It should be empty — no code path ever wrote to it —
but confirm rather than assume:

```sql
SELECT COUNT(*) FROM ohapi_media_jobs;
```

- **0** → continue.
- **anything else** → stop and report the count. The migration needs adjusting
  first; do not force it.

Also confirm the environment still has `DATABASE_URL` and `OHAPI_API_KEY` set.

## Step 2 — Replace workspace source with GitHub `main`

Take the workspace to the exact contents of `origin/main`. Do not merge, do not
cherry-pick, and do not keep local variants of files that exist in `main`.

Report the commit SHA the workspace lands on. It must match `origin/main`.

## Step 3 — Install and apply migrations

```bash
pnpm install --frozen-lockfile
pnpm db:push
```

`db:push` runs `drizzle-kit generate` then `drizzle-kit migrate`. Expect:

- `generate` to report **no schema changes** — migrations `0007`, `0008` and
  `0009` are already written. If it generates a new migration file, **stop**:
  that means the workspace schema differs from `main` and something is wrong.
- `migrate` to apply `0007`, `0008`, `0009`.

Report what `migrate` actually applied.

## Step 4 — Run the gates

```bash
pnpm check
pnpm test
pnpm build
```

All three must pass and the build must emit **no warnings**. If any fail, stop
and report the output — do not fix forward.

## Step 5 — Deploy

Deploy a new build from the workspace and report the deployed URL.

## Step 6 — Smoke check, then hand back

Visit the live site and report exactly what you see, without changing anything:

1. `/` — does it load? Is the companion grid populated or empty? (**Empty is the
   expected and correct result** until the catalog is synced in step 7.)
2. `/companions` — loads?
3. `/chat` — does it show a sign-in card, or does it bounce straight to a login
   screen? It should show an explained card.
4. `/pilot` — should redirect to `/companions`.
5. Open the browser console on `/` and report any errors.

## Step 7 — Owner action, not yours

The site owner signs in and runs **Sync from provider** at `/ops/ohapi`. That
populates the catalog. Report only that the site is ready for it.

---

## If it goes wrong

The previous application is commit `18d1885`, and the pre-sync state is preserved
at `recovery/provider-verified-rebuild-20260814`. Restoring workspace source
undoes application code. It does **not** undo migrations: `0007`–`0009` only add
columns and widen one, so the old code continues to work against the new schema.

## While you are there

You have ADMIN on the repository, so please also create the backup tag that could
not be pushed from the other session:

```bash
git tag -a backup/provider-verified-rebuild-20260814 462d953 -m "Provider-verified rebuild"
git push origin backup/provider-verified-rebuild-20260814
```
