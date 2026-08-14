import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function collectProductionSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return collectProductionSourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("isolated playground boundary", () => {
  it("does not allow the production application to import the browser-local development tool", () => {
    const productionFiles = ["client/src", "server", "shared", "drizzle"].flatMap(collectProductionSourceFiles);
    const prohibitedReference = ["tools", "oh-api-playground"].join("/");
    const offenders = productionFiles.filter(path => readFileSync(path, "utf8").includes(prohibitedReference));
    expect(offenders).toEqual([]);
  });
});
