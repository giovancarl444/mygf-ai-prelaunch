import { generateOhApiCharacterDraft } from "../server/ohapi";

const draft = await generateOhApiCharacterDraft({
  nationality: "American",
  ethnicity: "Caucasian",
  firstName: "Sienna",
  lastName: "Vale",
  biography: "Sienna Vale is a clearly adult fictional AI companion world: bright, observant, and lightly playful, designed for imaginative private text threads with clear AI boundaries.",
  gender: "Female",
  dateOfBirth: "1998-05-19",
});

console.log(JSON.stringify(draft));
