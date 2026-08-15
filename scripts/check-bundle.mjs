import { readFileSync } from "node:fs";
import { builtinModules } from "node:module";

/**
 * Fails the build if a server bundle imports something the server will not have.
 *
 * `--packages=external` leaves every bare import in the output for Node to
 * resolve at startup, and the server installs with `--prod`. So a development
 * dependency reached from server code produces a bundle that builds cleanly,
 * passes every test, deploys without complaint, and then exits with
 * ERR_MODULE_NOT_FOUND before serving a request — with the migration already
 * applied and the previous release replaced.
 *
 * That is what happened with Vite: `server/_core/index.ts` imported the
 * development server and the production server from the same module, so the
 * production entry point carried a static import of a package that only exists
 * on a developer's machine. Nothing before the deploy could have caught it,
 * because everything before the deploy has the full dependency tree installed.
 *
 * This is the check that has the same view as the server does.
 */

const BUNDLES = ["dist/index.js", "dist/migrate.js"];

const manifest = JSON.parse(readFileSync("package.json", "utf8"));
const production = new Set(Object.keys(manifest.dependencies ?? {}));
const development = new Set(Object.keys(manifest.devDependencies ?? {}));
const builtins = new Set(builtinModules);

const STATIC_IMPORT = /(?:^|[;\n])\s*import\s+(?:[^'"()]*?\sfrom\s*)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
const RE_EXPORT = /(?:^|[;\n])\s*export\s+(?:[^'"()]*?\sfrom\s*)?["']([^"']+)["']/g;

/** `@scope/name/deep/path` and `name/deep/path` both resolve against their package. */
function packageOf(specifier) {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

let failed = false;

for (const bundle of BUNDLES) {
  let source;
  try {
    source = readFileSync(bundle, "utf8");
  } catch {
    console.error(`✗ ${bundle} was not built.`);
    failed = true;
    continue;
  }

  const specifiers = new Set();
  for (const pattern of [STATIC_IMPORT, DYNAMIC_IMPORT, RE_EXPORT]) {
    for (const [, specifier] of source.matchAll(pattern)) specifiers.add(specifier);
  }

  const missing = [];
  const unknown = [];

  for (const specifier of specifiers) {
    // Relative specifiers are either bundled already or, like the development
    // server, deliberately external and never reached in production.
    if (specifier.startsWith(".") || specifier.startsWith("/")) continue;
    if (specifier.startsWith("node:") || builtins.has(specifier)) continue;

    const name = packageOf(specifier);
    if (production.has(name)) continue;
    if (development.has(name)) missing.push(`${specifier}  (a devDependency)`);
    else unknown.push(`${specifier}  (not declared in package.json)`);
  }

  if (missing.length || unknown.length) {
    failed = true;
    console.error(`\n✗ ${bundle} imports packages a production install will not have:\n`);
    for (const entry of [...missing, ...unknown]) console.error(`    ${entry}`);
    console.error(
      `\n  The server runs \`pnpm install --prod\`, so Node exits at startup rather than\n` +
        `  serving a request. Either move the package to dependencies, or reach it through\n` +
        `  \`await import()\` on a path production never takes and mark it external in the\n` +
        `  build — see server/_core/vite.ts.\n`
    );
  }
}

if (failed) process.exit(1);
console.log(`Server bundles import only production dependencies.`);
