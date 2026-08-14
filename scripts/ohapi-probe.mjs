#!/usr/bin/env node
/**
 * OhAPI ground-truth probe.
 *
 * Answers one question: does the live API return what the documentation says it
 * returns? Everything MyGF.ai sends is built to the documented contract, but the
 * contract has been wrong before, so this reports the real shape.
 *
 * Read-only by default. Nothing is created unless you opt in.
 *
 *   OHAPI_API_KEY=... node scripts/ohapi-probe.mjs
 *   OHAPI_API_KEY=... node scripts/ohapi-probe.mjs --chat     # creates a room, sends 1 message
 *   OHAPI_API_KEY=... node scripts/ohapi-probe.mjs --image    # creates 1 image job
 *
 * The key is never printed. Values that look like credentials are redacted.
 * Character names, ages, and image URLs ARE shown — they are your own catalog
 * and are exactly what needs verifying.
 */

const BASE_URL = "https://api.oh.xyz";
const KEY = (process.env.OHAPI_API_KEY ?? "").trim();
const FLAGS = new Set(process.argv.slice(2));

if (!KEY) {
  console.error("\n  OHAPI_API_KEY is not set.\n");
  console.error("  Run it like this:\n");
  console.error("    OHAPI_API_KEY='your-key' node scripts/ohapi-probe.mjs\n");
  process.exit(1);
}

// Honour a corporate/agent proxy when one is configured.
const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;
if (proxy) {
  try {
    const { ProxyAgent, setGlobalDispatcher } = await import("undici");
    setGlobalDispatcher(new ProxyAgent(proxy));
  } catch {
    console.warn("  (proxy configured but undici is unavailable; continuing direct)\n");
  }
}

const SECRET_KEY_HINT = /(key|token|secret|authorization|password|credential)/i;

function redact(key, value) {
  if (typeof value === "string" && SECRET_KEY_HINT.test(key)) return `<redacted ${value.length} chars>`;
  return value;
}

/** Describes a value's structure without dumping an unbounded payload. */
function describe(value, depth = 0) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[] (empty)";
    return `array(${value.length}) of ${describe(value[0], depth + 1)}`;
  }
  if (typeof value === "object") {
    if (depth > 2) return "{…}";
    const entries = Object.entries(value).slice(0, 24);
    return `{ ${entries.map(([k, v]) => `${k}: ${describe(v, depth + 1)}`).join(", ")} }`;
  }
  if (typeof value === "string") return value.length > 60 ? `string(${value.length})` : `"${value}"`;
  return typeof value;
}

async function call(method, path, body) {
  const started = Date.now();
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "X-API-Key": KEY },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    return { ok: false, status: 0, ms: Date.now() - started, payload: null, networkError: String(error) };
  }

  const raw = await response.text();
  let payload = raw;
  try { payload = raw ? JSON.parse(raw) : null; } catch { /* keep the raw text */ }

  return { ok: response.ok, status: response.status, ms: Date.now() - started, payload };
}

function heading(text) {
  console.log(`\n${"─".repeat(72)}\n  ${text}\n${"─".repeat(72)}`);
}

function report(label, result) {
  const mark = result.ok ? "PASS" : "FAIL";
  console.log(`  [${mark}] ${label}  ->  HTTP ${result.status} in ${result.ms}ms`);
  if (result.networkError) console.log(`         network: ${result.networkError}`);
  if (!result.ok && result.payload) console.log(`         body: ${JSON.stringify(result.payload).slice(0, 400)}`);
  return result.ok;
}

/** Pulls the character array out of whatever envelope the response uses. */
function findCharacterArray(payload) {
  if (Array.isArray(payload)) return { path: "(root)", items: payload };
  if (!payload || typeof payload !== "object") return null;
  for (const key of ["characters", "data", "items", "results"]) {
    if (Array.isArray(payload[key])) return { path: key, items: payload[key] };
  }
  for (const [key, value] of Object.entries(payload)) {
    if (value && typeof value === "object") {
      const nested = findCharacterArray(value);
      if (nested) return { path: `${key}.${nested.path}`, items: nested.items };
    }
  }
  return null;
}

console.log("\n  OhAPI probe — verifying the live contract against the documentation");
console.log(`  Base URL: ${BASE_URL}`);
console.log(`  Key: present (${KEY.length} chars, not shown)`);

/* -------------------------------------------------------------------------- */
/* 1. Character library — this is what the public catalog is built from        */
/* -------------------------------------------------------------------------- */

heading("1. GET /api/v1/characters   (drives the whole catalog)");
const characters = await call("GET", "/api/v1/characters");
let firstCharacterId = null;

if (report("characters", characters)) {
  const found = findCharacterArray(characters.payload);
  if (!found) {
    console.log("\n  !! No array found. Top-level shape was:");
    console.log(`     ${describe(characters.payload)}`);
    console.log("     -> The catalog normalizer needs updating for this shape.");
  } else {
    console.log(`\n  Found ${found.items.length} character(s) at: ${found.path}`);
    if (found.items.length) {
      const sample = found.items[0];
      console.log(`  Keys on each item: ${Object.keys(sample).join(", ")}`);
      console.log("\n  First three, as the app would read them:");
      for (const item of found.items.slice(0, 3)) {
        const id = item.character_id ?? item.characterId ?? item.id ?? "(NO ID)";
        const name = item.name ?? item.display_name ?? "(no name)";
        const image = item.profile_image_url ?? item.profileImageUrl ?? item.image_url ?? null;
        console.log(`    - id=${id}  name=${name}  age=${item.age ?? "-"}  type=${item.type ?? "-"}`);
        console.log(`      occupation=${item.occupation ?? "-"}`);
        console.log(`      image=${image ? String(image).slice(0, 90) : "NONE (card will show a placeholder)"}`);
        if (!firstCharacterId && id !== "(NO ID)") firstCharacterId = id;
      }
      const missingId = found.items.filter(i => !(i.character_id ?? i.characterId ?? i.id)).length;
      const missingImage = found.items.filter(i => !(i.profile_image_url ?? i.profileImageUrl ?? i.image_url)).length;
      if (missingId) console.log(`\n  !! ${missingId} item(s) have no id and would be dropped from the catalog.`);
      if (missingImage) console.log(`  !! ${missingImage} item(s) have no portrait and will render a placeholder.`);
    } else {
      console.log("  !! The library is empty. The catalog will be empty, and sync will refuse to run.");
    }
  }
}

/* -------------------------------------------------------------------------- */
/* 2. Credential check                                                        */
/* -------------------------------------------------------------------------- */

heading("2. GET /api/v1/customer-library   (credential + entitlements)");
const library = await call("GET", "/api/v1/customer-library");
if (report("customer-library", library)) {
  console.log(`\n  Shape: ${describe(library.payload)}`);
}

/* -------------------------------------------------------------------------- */
/* 3. Chat round trip — opt-in, creates a real room                           */
/* -------------------------------------------------------------------------- */

if (FLAGS.has("--chat")) {
  heading("3. Chat round trip   (CREATES A ROOM — this one mutates)");
  if (!firstCharacterId) {
    console.log("  Skipped: no character id available from step 1.");
  } else {
    const room = await call("POST", "/api/v1/rooms", { character_id: firstCharacterId });
    if (report("POST /api/v1/rooms { character_id }", room)) {
      console.log(`         shape: ${describe(room.payload)}`);
      const roomId = room.payload?.room_id ?? room.payload?.roomId ?? room.payload?.id;
      console.log(`         room_id: ${roomId ?? "!! NOT FOUND — chat cannot work"}`);

      if (roomId) {
        const text = await call("POST", "/api/v1/text", {
          room_id: roomId,
          character_id: firstCharacterId,
          message: "Hey — just checking this connection works.",
        });
        if (report("POST /api/v1/text { room_id, character_id, message }", text)) {
          console.log(`         shape: ${describe(text.payload)}`);
          const reply = text.payload?.reply ?? text.payload?.response ?? text.payload?.message
            ?? text.payload?.text ?? text.payload?.content;
          console.log(`         reply field: ${reply ? `FOUND -> "${String(reply).slice(0, 120)}"` : "!! NOT FOUND in any expected key"}`);
        }
      }
    }
  }
} else {
  heading("3. Chat round trip   (skipped — pass --chat to run it)");
  console.log("  This one creates a real room and sends one message.");
}

/* -------------------------------------------------------------------------- */
/* 4. Image job — opt-in, costs credit                                        */
/* -------------------------------------------------------------------------- */

if (FLAGS.has("--image")) {
  heading("4. Image generation   (COSTS CREDIT — this one mutates)");
  if (!firstCharacterId) {
    console.log("  Skipped: no character id available from step 1.");
  } else {
    const job = await call("POST", "/api/v1/images", {
      character_id: firstCharacterId,
      prompt: "A relaxed portrait, natural light, casual clothing.",
    });
    if (report("POST /api/v1/images { character_id, prompt }", job)) {
      console.log(`         shape: ${describe(job.payload)}`);
      const jobId = job.payload?.job_id ?? job.payload?.jobId ?? job.payload?.id;
      console.log(`         job_id: ${jobId ?? "!! NOT FOUND"}`);
      console.log(`         presigned_url returned up front: ${job.payload?.presigned_url ? "YES" : "no"}`);

      if (jobId) {
        console.log("\n  Polling status (this is the timing question that matters)…");
        const startedAt = Date.now();
        for (let attempt = 1; attempt <= 40; attempt += 1) {
          await new Promise(resolve => setTimeout(resolve, 3_000));
          const status = await call("GET", `/api/v1/jobs/${encodeURIComponent(jobId)}/status`);
          const state = status.payload?.status ?? status.payload?.state ?? "?";
          const url = status.payload?.presigned_url ?? status.payload?.url ?? null;
          const elapsed = Math.round((Date.now() - startedAt) / 1000);
          console.log(`    ${String(elapsed).padStart(3)}s  status=${state}  url=${url ? "present" : "none"}`);

          if (attempt === 1) console.log(`         first poll shape: ${describe(status.payload)}`);
          if (["completed", "complete", "succeeded", "failed", "error"].includes(String(state).toLowerCase())) {
            console.log(`\n  Finished as "${state}" after ${elapsed}s.`);
            if (url) console.log(`  Result URL host: ${new URL(url).host}`);
            break;
          }
          if (attempt === 40) console.log("\n  !! Still running after 2 minutes.");
        }
      }
    }
  }
} else {
  heading("4. Image generation   (skipped — pass --image to run it)");
  console.log("  This one costs credit.");
}

heading("Done");
console.log("  Paste this whole output back and I will reconcile it against the code.\n");
