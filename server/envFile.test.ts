import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyEnvFile, parseEnvFile } from "./envFile";

const KEYS = ["DATABASE_URL", "OHAPI_API_KEY", "ALREADY_SET"] as const;
afterEach(() => { for (const key of KEYS) delete process.env[key]; });

function writeEnv(contents: string): string {
  const path = join(mkdtempSync(join(tmpdir(), "envfile-")), ".env");
  writeFileSync(path, contents);
  return path;
}

describe("reading an environment file", () => {
  it("reads a plain assignment", () => {
    expect(parseEnvFile("DATABASE_URL=mysql://u:p@h:25060/d")).toEqual({ DATABASE_URL: "mysql://u:p@h:25060/d" });
  });

  /**
   * The failure this module exists to prevent. Bash reads `$` and a backtick as
   * instructions; systemd and dotenv read them as characters. A password
   * containing either used to mean the migration and the running server
   * disagreed about the credential, and only one of them said so.
   */
  it.each([
    ["a dollar sign", "mysql://doadmin:AVNS_a$bc9de@host:25060/defaultdb"],
    ["a backquote", "mysql://doadmin:AVNS_a`bc9de@host:25060/defaultdb"],
    ["a backslash", "mysql://doadmin:AVNS_a\\bc9de@host:25060/defaultdb"],
    ["a double quote", 'mysql://doadmin:AVNS_a"bc9de@host:25060/defaultdb'],
    ["an exclamation mark", "mysql://doadmin:AVNS_a!bc9de@host:25060/defaultdb"],
  ])("keeps %s in a password exactly as written", (_name, url) => {
    expect(parseEnvFile(`DATABASE_URL=${url}`).DATABASE_URL).toBe(url);
  });

  it("expands nothing, even where a shell would", () => {
    process.env.ALREADY_SET = "leaked";
    expect(parseEnvFile("DATABASE_URL=before$ALREADY_SET after").DATABASE_URL).toBe("before$ALREADY_SET after");
  });

  it("treats a matched pair of quotes as a container", () => {
    expect(parseEnvFile(`A="quoted"\nB='quoted'`)).toEqual({ A: "quoted", B: "quoted" });
  });

  it("keeps quotes that are part of the value", () => {
    expect(parseEnvFile(`A="opens only\nB=mid"dle`)).toEqual({ A: '"opens only', B: 'mid"dle' });
  });

  it("keeps everything after the first equals sign", () => {
    expect(parseEnvFile("URL=mysql://u:p@h/d?a=1&b=2").URL).toBe("mysql://u:p@h/d?a=1&b=2");
  });

  it("skips comments, blank lines, and anything that is not an assignment", () => {
    expect(parseEnvFile("# a comment\n; another\n\n  \nnot an assignment\nA=1")).toEqual({ A: "1" });
  });

  it("survives a file written on Windows", () => {
    expect(parseEnvFile("A=1\r\nB=2\r\n")).toEqual({ A: "1", B: "2" });
  });
});

describe("applying an environment file", () => {
  it("sets what the environment does not already have", () => {
    const path = writeEnv("DATABASE_URL=mysql://u:p@h:25060/d\nOHAPI_API_KEY=abc\n");
    expect(applyEnvFile(path).sort()).toEqual(["DATABASE_URL", "OHAPI_API_KEY"]);
    expect(process.env.DATABASE_URL).toBe("mysql://u:p@h:25060/d");
  });

  it("leaves an existing value alone, so one run can still override the file", () => {
    process.env.ALREADY_SET = "from the environment";
    const path = writeEnv("ALREADY_SET=from the file\n");
    expect(applyEnvFile(path)).toEqual([]);
    expect(process.env.ALREADY_SET).toBe("from the environment");
  });

  /**
   * Names only. This reads a file whose entire contents are credentials, so
   * anything it hands back is a candidate for a log line.
   */
  it("reports names and never values", () => {
    const path = writeEnv("OHAPI_API_KEY=a-real-looking-secret\n");
    expect(applyEnvFile(path).join()).not.toContain("a-real-looking-secret");
  });

  it("says nothing when there is no such file, so a local run is unaffected", () => {
    expect(applyEnvFile("/nonexistent/.env")).toEqual([]);
  });
});
