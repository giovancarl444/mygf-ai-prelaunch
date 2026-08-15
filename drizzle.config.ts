import { defineConfig } from "drizzle-kit";
import { parseDatabaseUrl } from "./server/databaseUrl";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

// Migrations run against the same managed database as the application, so they
// need the same TLS translation. Without it `drizzle-kit migrate` fails at the
// one moment it matters most: the first deploy.
const connection = parseDatabaseUrl(connectionString);

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: connection.ssl
    ? { url: connection.uri, ssl: connection.ssl }
    : { url: connection.uri },
});
