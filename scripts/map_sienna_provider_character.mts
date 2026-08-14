import { upsertApprovedOhapiCharacter } from "../server/ohapiDb";

const mapping = await upsertApprovedOhapiCharacter({
  worldSlug: "sienna-vale",
  displayName: "Sienna Vale",
  providerCharacterId: "21555",
});

console.log(JSON.stringify({
  id: mapping?.id,
  worldSlug: mapping?.worldSlug,
  displayName: mapping?.displayName,
  providerCharacterId: mapping?.providerCharacterId,
  status: mapping?.status,
}));
