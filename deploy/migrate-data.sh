#!/usr/bin/env bash
#
# Brings the schema up and, optionally, moves existing data onto it.
#
#   bash deploy/migrate-data.sh                  # schema only — a clean start
#   bash deploy/migrate-data.sh old-data.sql     # schema, then that data
#
# Run from a clone of the repository, with DATABASE_URL pointing at the *new*
# database.
#
# **The order is the entire point of this script.** The production migration
# ledger has been broken since the original deploy, which is why every schema
# change so far has been hand-run SQL. Building the schema from zero with
# drizzle-kit writes that ledger correctly and repairs the problem for good —
# but only if it happens before any old tables land. Import a dump containing
# table definitions first and the broken state comes with it.
set -euo pipefail

DUMP="${1:-}"

say() { printf '\n\033[1;35m▸ %s\033[0m\n' "$1"; }
note() { printf '  %s\n' "$1"; }
fail() { printf '\n\033[1;31m✗ %s\033[0m\n\n' "$1" >&2; exit 1; }

[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL must point at the new database.
  Example:
    DATABASE_URL='mysql://user:pass@host:25060/defaultdb' bash deploy/migrate-data.sh"

[ -f package.json ] || fail "Run this from the repository root."

if [ -n "$DUMP" ]; then
  [ -f "$DUMP" ] || fail "No such file: $DUMP"
  # A dump carrying table definitions would recreate the old, unversioned
  # schema underneath the ledger this script is trying to repair.
  if grep -qiE '^\s*CREATE TABLE' "$DUMP"; then
    fail "$DUMP contains CREATE TABLE statements.

  Re-export it with --no-create-info so it carries rows only:

    mysqldump --single-transaction --no-create-info --set-gtid-purged=OFF \\
      -h <old-host> -u <user> -p <database> > old-data.sql

  Importing table definitions is exactly what keeps the migration ledger broken."
  fi
  note "Dump looks like data only. Good."
fi

say "Building the schema from the migrations"
note "This is what writes __drizzle_migrations correctly."
pnpm exec drizzle-kit migrate

say "Checking what exists now"
node -e '
const url = new URL(process.env.DATABASE_URL);
console.log("  host:    ", url.hostname);
console.log("  database:", url.pathname.replace("/", ""));
' || true

if [ -z "$DUMP" ]; then
  cat <<'DONE'

  Schema is up and the ledger is correct. Nothing was imported, which is the
  right outcome for a clean start — the companion catalogue rebuilds itself
  from the provider on the first sync at /ops/ohapi.

DONE
  exit 0
fi

say "Importing rows"
note "From: $DUMP"
# Parsed rather than passed through, so the password never appears in ps output.
node -e '
const url = new URL(process.env.DATABASE_URL);
const parts = [
  "-h", url.hostname,
  "-P", url.port || "3306",
  "-u", decodeURIComponent(url.username),
  url.pathname.replace("/", ""),
];
process.stdout.write(parts.join("\n"));
' > /tmp/mysql-args.$$
mapfile -t MYSQL_ARGS < /tmp/mysql-args.$$
rm -f /tmp/mysql-args.$$

MYSQL_PWD="$(node -e 'process.stdout.write(decodeURIComponent(new URL(process.env.DATABASE_URL).password))')" \
  mysql --ssl-mode=REQUIRED "${MYSQL_ARGS[@]}" < "$DUMP"

cat <<'DONE'

  Imported. Sign in and open /ops/ohapi to confirm the catalogue, then run a
  sync so portrait URLs are refreshed — the ones in the old database expired an
  hour after they were issued.

DONE
