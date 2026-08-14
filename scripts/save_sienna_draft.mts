import { saveOhApiCharacterDraft } from "../server/ohapi";

const result = await saveOhApiCharacterDraft("dc954093-5e8a-4ccb-a238-615679282937");
console.log(JSON.stringify(result));
