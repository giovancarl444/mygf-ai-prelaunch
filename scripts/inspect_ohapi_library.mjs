const response = await fetch("https://api.oh.xyz/api/v1/customer-library", {
  headers: { "X-API-Key": process.env.OHAPI_API_KEY ?? "" },
});

if (!response.ok) {
  throw new Error(`OhAPI customer-library request failed with ${response.status}`);
}

const body = await response.json();
const value = body && typeof body === "object" ? body : {};
const arrays = Object.entries(value).filter(([, entry]) => Array.isArray(entry));

console.log(JSON.stringify({
  topLevelKeys: Object.keys(value),
  collections: arrays.map(([key, entry]) => ({
    key,
    count: entry.length,
    firstItemKeys: entry[0] && typeof entry[0] === "object" ? Object.keys(entry[0]) : [],
    sampleIdentifiers: entry.slice(0, 3).map(item => {
      if (!item || typeof item !== "object") return item;
      const record = item;
      return {
        id: record.id ?? null,
        characterId: record.characterId ?? record.character_id ?? null,
        guid: record.characterGuid ?? record.character_guid ?? null,
        name: record.name ?? record.displayName ?? null,
        status: record.status ?? null,
      };
    }),
  })),
}, null, 2));
