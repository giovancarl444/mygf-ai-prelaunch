import { getOhApiCharacterDraft } from "../server/ohapi";

const draft = await getOhApiCharacterDraft("12d8d8ff-c5a2-4b6d-8f07-b0e0efde1956");
const character = draft.character ?? {};
const profile = draft.generatedProfile ?? {};

console.log(JSON.stringify({
  firstName: character.firstName ?? null,
  lastName: character.lastName ?? null,
  dateOfBirth: character.dateOfBirth ?? null,
  age: character.age ?? null,
  gender: character.gender ?? null,
  nationality: character.nationality ?? null,
  ethnicity: character.ethnicity ?? null,
  job: character.job ?? null,
  whereYouLive: character.whereYouLive ?? null,
  personality: character.personality ?? profile.personality ?? null,
  interests: character.interests ?? profile.interests ?? null,
  profileKeys: Object.keys(profile),
}, null, 2));
