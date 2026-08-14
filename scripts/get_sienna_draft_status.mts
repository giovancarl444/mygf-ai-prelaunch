import { getOhApiCharacterDraftStatus } from "../server/ohapi";

const status = await getOhApiCharacterDraftStatus("12d8d8ff-c5a2-4b6d-8f07-b0e0efde1956");
console.log(JSON.stringify(status));
