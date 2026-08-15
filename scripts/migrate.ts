import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { describeConnectionFailure, parseDatabaseUrl } from "../server/databaseUrl";

/**
 * Applies pending migrations, on the machine that can reach the database.
 *
 * This exists instead of `drizzle-kit migrate` for one reason: drizzle-kit is a
 * development dependency and a TypeScript config loader, and needing it on the
 * server meant installing the entire development tree there. Bundled into
 * `dist/` alongside the application, this needs nothing the server does not
 * already have — the migrator ships inside drizzle-orm, which is a production
 * dependency, and it writes the same `__drizzle_migrations` ledger.
 *
 * It has to run here rather than in CI because the database accepts
 * connections only from this machine, which is the point of the trusted-source
 * rule and not something to work around.
 */

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Nothing was applied.");
  process.exit(1);
}

const connection = parseDatabaseUrl(url);

try {
  const db = connection.ssl
    ? drizzle({ connection: { uri: connection.uri, ssl: connection.ssl } })
    : drizzle(connection.uri);

  // The folder shipped with the release, containing the SQL and the journal
  // that records which of it has already run.
  await migrate(db, { migrationsFolder: "drizzle" });

  console.log("Migrations applied.");
  process.exit(0);
} catch (error) {
  console.error("Migration failed:", describeConnectionFailure(error));
  process.exit(1);
}
