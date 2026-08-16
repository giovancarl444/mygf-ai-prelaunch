#!/usr/bin/env node
/**
 * Batch character creation against the provider's V2 draft flow.
 *
 *   OHAPI_API_KEY=... node scripts/ohapi-create-characters.mjs --candidates 3
 *   OHAPI_API_KEY=... node scripts/ohapi-create-characters.mjs --candidates 3 --auto-save
 *
 * COSTS CREDIT: every /generate call and every /save call is billed by the
 * provider. Each generate creates a fresh characterGuid with its own reference
 * images; only the candidates you save become characters. The rest are simply
 * abandoned — that is the "generate several, keep the best" pattern the
 * provider's own flow is built around, and a saved character's reference
 * images can never be regenerated.
 *
 * Follows the ohapi-probe.mjs conventions: key from the environment, clean
 * stdout, no files written.
 */

const BASE_URL = "https://api.oh.xyz";
const key = process.env.OHAPI_API_KEY;
if (!key) {
  console.error("Set OHAPI_API_KEY before running. The provider rejects every call without it.");
  process.exit(1);
}

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const count = Math.max(1, Math.min(6, Number(args[args.indexOf("--candidates") + 1] ?? 3) || 3));
const autoSave = flag("auto-save");

if (autoSave) {
  console.error("Refusing --auto-save: saving is a one-way door (reference images can never be\nregenerated). Review the candidates, then re-run and pick by guid.");
  process.exit(1);
}

/**
 * Candidate matrix. Values match what the ops studio's draft schema sends:
 * free-text nationality/ethnicity/names/biography the provider interprets,
 * plus a birth date that keeps everyone at 21+.
 *
 * Ethnicity is validated against the provider's catalog
 * (GET /api/v1/characters/ethnicities — 108 values, verified live); an
 * unknown value is rejected with a 400 that still costs nothing but the
 * attempt. Nationalities: GET /api/v1/characters/nationalities.
 */
const archetypes = [
  {
    firstName: "Nora", lastName: "Lindqvist", nationality: "Swedish", ethnicity: "Scandinavian",
    biography: "A marine biology student who free-dives on weekends and sends voice notes from the pier. Curious, calm, and direct about what she wants.",
  },
  {
    firstName: "Alma", lastName: "Reyes", nationality: "Spanish", ethnicity: "Latina",
    biography: "A flamenco-trained physiotherapist in Seville who argues passionately about food and thinks every problem looks smaller after a walk.",
  },
  {
    firstName: "Yuki", lastName: "Tanaka", nationality: "Japanese", ethnicity: "Japanese",
    biography: "A midnight-shift illustrator in Osaka who collects vending-machine stories and falls asleep to rain sounds. Soft-spoken with a sharp sense of humor.",
  },
  {
    firstName: "Maren", lastName: "Vogel", nationality: "German", ethnicity: "German",
    biography: "A structural engineer from Hamburg who bakes when she cannot sleep and explains the city's bridges with real enthusiasm. Pragmatic, warm, unexpectedly silly.",
  },
  {
    firstName: "Camila", lastName: "Duarte", nationality: "Brazilian", ethnicity: "Latina",
    biography: "A surf instructor from Florianópolis who names every board and narrates sunsets like a documentary. Loud laugh, long messages, zero pretense.",
  },
  {
    firstName: "Ines", lastName: "Moreau", nationality: "French", ethnicity: "Western European",
    biography: "A used-bookstore owner in Lyon who writes letters instead of texts and knows one perfect sentence for every occasion. Slow, deliberate, magnetic.",
  },
];

function pickArchetype(index) {
  return archetypes[index % archetypes.length];
}

function birthDateFor(age) {
  const year = new Date().getUTCFullYear() - age;
  return `${year}-06-14`;
}

async function call(method, path, body) {
  const started = Date.now();
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-API-Key": key },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* raw body kept for the error path */ }
  if (!response.ok) {
    console.error(`[FAIL] ${method} ${path} → HTTP ${response.status} in ${Date.now() - started}ms\n${text.slice(0, 400)}`);
    process.exit(1);
  }
  return json;
}

async function waitForReady(guid) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const state = await call("GET", `/api/v2/characters/${guid}/status`);
    if (state.status === "ready" || state.status === "saved") return state;
    if (state.status === "failed") {
      console.error(`[FAIL] draft ${guid} failed on the provider side`);
      return null;
    }
    await new Promise(resolve => setTimeout(resolve, 2500));
  }
  console.error(`[WARN] draft ${guid} never reported ready; skipping`);
  return null;
}

async function main() {
  console.log(`Generating ${count} candidate${count === 1 ? "" : "s"} (COSTS CREDIT: one generate per candidate).\n`);
  const candidates = [];

  for (let index = 0; index < count; index++) {
    const archetype = pickArchetype(index);
    const age = 22 + ((index * 3) % 9);
    const draft = {
      firstName: archetype.firstName,
      lastName: archetype.lastName,
      nationality: archetype.nationality,
      ethnicity: archetype.ethnicity,
      gender: "Female",
      dateOfBirth: birthDateFor(age),
      biography: archetype.biography,
    };

    const generated = await call("POST", "/api/v2/characters/generate", draft);
    const guid = generated.characterGuid ?? generated.character_guid ?? generated.guid;
    if (!guid) {
      console.error(`[FAIL] no characterGuid in the response for candidate ${index + 1}`);
      continue;
    }
    console.log(`[PASS] candidate ${index + 1}: ${draft.firstName} ${draft.lastName} (${age}) → guid ${guid}, polling for reference images…`);

    const ready = await waitForReady(guid);
    if (!ready) continue;

    const detail = await call("GET", `/api/v2/characters/${guid}`);
    candidates.push({ guid, draft, detail });
    const portrait = detail?.character?.sfwImage ?? detail?.sfwImage ?? detail?.character?.profile_image_url ?? null;
    console.log(`       ready — portrait: ${portrait ?? "(inspect the draft for image URLs)"}`);
  }

  if (!candidates.length) {
    console.error("\nNo candidates reached ready state.");
    process.exit(1);
  }

  console.log(`\n${candidates.length} candidate${candidates.length === 1 ? "" : "s"} ready. Review, then save the winners:`);
  for (const candidate of candidates) {
    console.log(`  ${candidate.guid}  ${candidate.draft.firstName} ${candidate.draft.lastName}`);
  }
  console.log(`\n  OHAPI_API_KEY=... node scripts/ohapi-create-characters.mjs --save <guid>\n`);
}

async function saveOne(guid) {
  const state = await call("GET", `/api/v2/characters/${guid}/status`);
  if (state.status !== "ready") {
    console.error(`[FAIL] ${guid} is "${state.status}", not ready — only a ready draft can be saved.`);
    process.exit(1);
  }
  const saved = await call("POST", "/api/v2/characters/save", { characterGuid: guid });
  const characterId = saved.characterId ?? saved.character_id ?? "(see response)";
  console.log(`[PASS] saved ${guid} → characterId ${JSON.stringify(characterId)}`);
  console.log("Sync it into the catalog from /ops/ohapi → refresh library.");
}

const saveIndex = args.indexOf("--save");
if (saveIndex !== -1 && args[saveIndex + 1]) {
  await saveOne(args[saveIndex + 1]);
} else {
  await main();
}
