import { readFileSync } from "node:fs";

/**
 * Turns a managed-database connection string into something mysql2 understands.
 *
 * Managed providers hand out a URL ending `?ssl-mode=REQUIRED` and then refuse
 * any connection that is not encrypted. mysql2 does not recognise that
 * parameter — it looks for an `ssl` option — so passing the URL through
 * untouched produces a plaintext connection attempt, a refusal at the server,
 * and an error that says nothing about TLS. This translates between the two.
 *
 * `DATABASE_CA_CERT` may hold either a PEM or a path to one, for providers
 * whose database certificates are not signed by a publicly trusted authority.
 */

export type DatabaseConnection = {
  uri: string;
  ssl?: { rejectUnauthorized: boolean; ca?: string };
};

const REQUIRES_TLS = new Set(["required", "require", "verify_ca", "verify-ca", "verify_identity", "true", "1"]);

function readCaCertificate(): string | undefined {
  const configured = process.env.DATABASE_CA_CERT?.trim();
  if (!configured) return undefined;
  if (configured.includes("BEGIN CERTIFICATE")) return configured;
  try {
    return readFileSync(configured, "utf8");
  } catch (error) {
    console.error("[Database] DATABASE_CA_CERT is set but could not be read:", error);
    return undefined;
  }
}

export function parseDatabaseUrl(rawUrl: string): DatabaseConnection {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    // Not a URL we can reason about — hand it back untouched rather than
    // failing here, so the driver produces its own error.
    return { uri: rawUrl };
  }

  const params = url.searchParams;
  const mode = (params.get("ssl-mode") ?? params.get("sslmode") ?? params.get("ssl") ?? "").toLowerCase();

  // These are ours to interpret; leaving them on the URI would have mysql2
  // treat them as unknown connection options.
  for (const key of ["ssl-mode", "sslmode", "ssl"]) params.delete(key);
  url.search = params.toString();

  if (!REQUIRES_TLS.has(mode)) return { uri: url.toString() };

  const ca = readCaCertificate();
  return {
    uri: url.toString(),
    // Verification stays on. A managed database reached over a private network
    // is not an excuse to accept any certificate presented, and turning this
    // off is the kind of thing that quietly outlives the afternoon it was done.
    ssl: ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true },
  };
}

/** Explains the failure that TLS misconfiguration actually produces. */
export function describeConnectionFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/self.signed|unable to verify|CERT_/i.test(message)) {
    return `${message}\n\n  The database's certificate could not be verified. Download the provider's `
      + `CA certificate and point DATABASE_CA_CERT at it — for DigitalOcean it is on the database's `
      + `Overview page, under "Download CA certificate".`;
  }
  if (/insecure|SSL connection|secure connection/i.test(message)) {
    return `${message}\n\n  The server requires an encrypted connection. Make sure DATABASE_URL still `
      + `ends with ?ssl-mode=REQUIRED — that is what turns TLS on.`;
  }
  return message;
}
