#!/usr/bin/env node
/**
 * Captures the provider's OpenAPI specification and regenerates the reference.
 *
 * The published documentation page renders its request tables client-side from
 * `/openapi.json`, which means a plain text fetch of the page returns a partial
 * document. That has already produced one wrong conclusion — that the image
 * endpoint accepted no quality parameters, when it accepts three. The spec is
 * the machine-readable source, so it is vendored here and diffed rather than
 * read through a browser.
 *
 * Read-only. Touches no key, creates nothing provider-side.
 *
 *   node scripts/ohapi-docs.mjs           # refresh and report what changed
 *   node scripts/ohapi-docs.mjs --check   # fail if the vendored copy is stale
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const SPEC_URL = "https://api.oh.xyz/openapi.json";
const ROOT = path.resolve(import.meta.dirname, "..");
const SPEC_PATH = path.join(ROOT, "docs", "ohapi-openapi.json");
const REFERENCE_PATH = path.join(ROOT, "docs", "OHAPI_REFERENCE.md");
const checkOnly = process.argv.includes("--check");

const METHODS = ["get", "post", "put", "patch", "delete"];

function resolveRef(spec, node, seen = new Set()) {
  if (Array.isArray(node)) return node.map(item => resolveRef(spec, item, seen));
  if (!node || typeof node !== "object") return node;
  if (typeof node.$ref === "string") {
    if (seen.has(node.$ref)) return {};
    let cursor = spec;
    for (const part of node.$ref.replace(/^#\//, "").split("/")) cursor = cursor?.[part];
    return resolveRef(spec, cursor ?? {}, new Set([...seen, node.$ref]));
  }
  return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, resolveRef(spec, value, seen)]));
}

function describeType(schema) {
  if (!schema) return "?";
  if (schema.enum) return `enum(${schema.enum.join(" | ")})`;
  if (schema.oneOf || schema.anyOf) {
    return (schema.oneOf ?? schema.anyOf).map(describeType).join(" | ");
  }
  if (schema.type === "array") return `${describeType(schema.items)}[]`;
  return schema.type ?? "object";
}

function renderReference(spec) {
  const lines = [
    "# OhAPI reference",
    "",
    "**Generated — do not edit by hand.** Run `node scripts/ohapi-docs.mjs` to refresh.",
    "",
    `Captured from \`${SPEC_URL}\`. Spec version \`${spec.info?.version ?? "?"}\`, `
      + `OpenAPI \`${spec.openapi ?? "?"}\`.`,
    "",
    "This is the provider's own machine-readable description of itself. Where it",
    "disagrees with `server/ohapi.ts`, the divergence is deliberate and recorded in",
    "`OHAPI_INTEGRATION.md` — this file does not overrule observed behaviour.",
    "",
  ];

  const groups = new Map();
  for (const [route, operations] of Object.entries(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries(operations)) {
      if (!METHODS.includes(method)) continue;
      const group = (operation.tags?.[0] ?? route.split("/")[3] ?? "other").toString();
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push({ route, method, operation });
    }
  }

  lines.push(`${[...groups.values()].reduce((n, g) => n + g.length, 0)} operations across ${groups.size} groups.`, "");

  for (const [group, entries] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`## ${group}`, "");
    for (const { route, method, operation } of entries.sort((a, b) => a.route.localeCompare(b.route))) {
      lines.push(`### \`${method.toUpperCase()} ${route}\``, "");
      if (operation.summary) lines.push(operation.summary, "");

      const body = resolveRef(spec, operation.requestBody ?? {});
      const schema = body.content?.["application/json"]?.schema;
      const properties = schema?.properties ?? {};
      const required = new Set(schema?.required ?? []);

      if (Object.keys(properties).length) {
        lines.push("| Field | Type | Required | Description |", "| --- | --- | --- | --- |");
        for (const [name, property] of Object.entries(properties)) {
          const description = (property.description ?? "")
            .replace(/\s+/g, " ")
            .replace(/\|/g, "\\|")
            .trim();
          const dflt = property.default === undefined ? "" : ` _(default \`${property.default}\`)_`;
          lines.push(
            `| \`${name}\` | ${describeType(property).replace(/\|/g, "\\|")} | `
            + `${required.has(name) ? "yes" : "no"} | ${description}${dflt} |`,
          );
        }
        lines.push("");
      }

      const responses = resolveRef(spec, operation.responses ?? {});
      for (const [code, response] of Object.entries(responses)) {
        const media = response.content?.["application/json"];
        const example = media?.example ?? media?.schema?.example;
        lines.push(`**${code}** — ${response.description ?? ""}`.trim());
        if (example) lines.push("", "```json", JSON.stringify(example, null, 2).slice(0, 1400), "```");
        lines.push("");
      }
    }
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

const response = await fetch(SPEC_URL);
if (!response.ok) {
  console.error(`Could not read the specification: HTTP ${response.status}`);
  process.exit(1);
}
const spec = await response.json();
const serialized = `${JSON.stringify(spec, null, 2)}\n`;
const reference = renderReference(spec);

const previous = existsSync(SPEC_PATH) ? readFileSync(SPEC_PATH, "utf8") : null;
if (previous === serialized) {
  console.log("The vendored specification is current.");
  process.exit(0);
}

if (previous === null) {
  console.log("No vendored specification yet — writing the first copy.");
} else {
  const routesOf = json => new Set(
    Object.entries(JSON.parse(json).paths ?? {}).flatMap(([route, ops]) =>
      Object.keys(ops).filter(m => METHODS.includes(m)).map(m => `${m.toUpperCase()} ${route}`)),
  );
  const before = routesOf(previous);
  const after = routesOf(serialized);
  const added = [...after].filter(r => !before.has(r));
  const removed = [...before].filter(r => !after.has(r));
  console.log("The specification changed.");
  for (const route of added) console.log(`  + ${route}`);
  for (const route of removed) console.log(`  - ${route}`);
  if (!added.length && !removed.length) console.log("  (same routes; fields or descriptions moved)");
}

if (checkOnly) {
  console.error("Vendored copy is stale. Run: node scripts/ohapi-docs.mjs");
  process.exit(1);
}

mkdirSync(path.dirname(SPEC_PATH), { recursive: true });
writeFileSync(SPEC_PATH, serialized);
writeFileSync(REFERENCE_PATH, reference);
console.log(`Wrote ${path.relative(ROOT, SPEC_PATH)} and ${path.relative(ROOT, REFERENCE_PATH)}.`);
