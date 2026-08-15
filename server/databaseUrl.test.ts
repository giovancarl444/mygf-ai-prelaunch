import { afterEach, describe, expect, it } from "vitest";
import { describeConnectionFailure, parseDatabaseUrl } from "./databaseUrl";

const DO_URL = "mysql://doadmin:pw@private-db-do-user-1-0.k.db.ondigitalocean.com:25060/defaultdb?ssl-mode=REQUIRED";

afterEach(() => { delete process.env.DATABASE_CA_CERT; });

/**
 * Managed providers advertise required TLS with a parameter mysql2 does not
 * read, then refuse the plaintext connection that results. The error says
 * nothing about TLS, which is what makes this worth translating rather than
 * debugging later on a first deploy.
 */
describe("preparing a managed connection string", () => {
  it("turns TLS on when the provider demands it", () => {
    const connection = parseDatabaseUrl(DO_URL);
    expect(connection.ssl).toEqual({ rejectUnauthorized: true });
  });

  it("removes the parameter the driver would treat as an unknown option", () => {
    expect(parseDatabaseUrl(DO_URL).uri).not.toContain("ssl-mode");
  });

  it("keeps everything that identifies the database", () => {
    const { uri } = parseDatabaseUrl(DO_URL);
    expect(uri).toContain("private-db-do-user-1-0.k.db.ondigitalocean.com:25060");
    expect(uri).toContain("/defaultdb");
    expect(uri).toContain("doadmin");
  });

  it.each(["sslmode=require", "ssl-mode=VERIFY_CA", "ssl=true"])("recognises %s", param => {
    expect(parseDatabaseUrl(`mysql://u:p@h:3306/d?${param}`).ssl).toBeTruthy();
  });

  it("leaves a plain local connection alone", () => {
    const connection = parseDatabaseUrl("mysql://root:pw@127.0.0.1:3306/mygf");
    expect(connection.ssl).toBeUndefined();
    expect(connection.uri).toBe("mysql://root:pw@127.0.0.1:3306/mygf");
  });

  it("carries a supplied certificate through", () => {
    process.env.DATABASE_CA_CERT = "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----";
    expect(parseDatabaseUrl(DO_URL).ssl).toMatchObject({ rejectUnauthorized: true, ca: expect.stringContaining("BEGIN CERTIFICATE") });
  });

  /**
   * Verification stays on even without a certificate to pin. A database on a
   * private network is not a reason to accept whatever certificate is
   * presented, and that setting outlives the afternoon it gets added.
   */
  it("never disables verification", () => {
    expect(parseDatabaseUrl(DO_URL).ssl?.rejectUnauthorized).toBe(true);
    process.env.DATABASE_CA_CERT = "/nonexistent/path.crt";
    expect(parseDatabaseUrl(DO_URL).ssl?.rejectUnauthorized).toBe(true);
  });

  it("hands back anything it cannot parse, rather than failing here", () => {
    expect(parseDatabaseUrl("not a url").uri).toBe("not a url");
  });
});

describe("explaining a failed connection", () => {
  it("points an unverifiable certificate at the fix", () => {
    expect(describeConnectionFailure(new Error("self-signed certificate in certificate chain")))
      .toContain("DATABASE_CA_CERT");
  });

  it("points a rejected plaintext connection at the fix", () => {
    expect(describeConnectionFailure(new Error("Connections using insecure transport are prohibited")))
      .toContain("ssl-mode=REQUIRED");
  });

  it("leaves an unrelated failure as it found it", () => {
    expect(describeConnectionFailure(new Error("ER_ACCESS_DENIED_ERROR"))).toBe("ER_ACCESS_DENIED_ERROR");
  });
});
