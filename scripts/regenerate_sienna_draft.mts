import { generateOhApiCharacterDraft } from "../server/ohapi";

const draft = await generateOhApiCharacterDraft({
  nationality: "American",
  ethnicity: "Caucasian",
  firstName: "Sienna",
  lastName: "Vale",
  biography: "Sienna Vale is a clearly adult fictional AI companion world: an independent cultural editor with a sharp eye for details, a calm confidence, and a lightly playful way of turning ordinary moments into private imaginative threads.",
  gender: "Female",
  dateOfBirth: "1998-05-19",
  job: "Independent cultural editor",
  whereYouLive: "Brooklyn, New York, USA",
});

console.log(JSON.stringify(draft));
