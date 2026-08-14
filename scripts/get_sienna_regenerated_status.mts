import { getOhApiCharacterDraftStatus } from "../server/ohapi";

const status = await getOhApiCharacterDraftStatus("dc954093-5e8a-4ccb-a238-615679282937");
console.log(JSON.stringify(status));
