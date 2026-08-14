import { z } from "zod";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";

export const betaInterestOptions = [
  "story/character continuity",
  "reflective conversation",
  "imaginative roleplay",
  "curious about AI",
] as const;

export const betaInterestInputSchema = z.object({
  email: z.string().trim().email().max(320),
  interest: z.enum(betaInterestOptions).optional(),
});

export type BetaInterestInput = z.infer<typeof betaInterestInputSchema>;

type BetaInterestDependencies = {
  findByEmail: (email: string) => Promise<unknown>;
  create: (input: { email: string; interest?: (typeof betaInterestOptions)[number]; source: string }) => Promise<void>;
  notify: (payload: { title: string; content: string }) => Promise<boolean>;
};

const defaultDependencies: BetaInterestDependencies = {
  findByEmail: db.findBetaInterestByEmail,
  create: db.createBetaInterest,
  notify: notifyOwner,
};

export function buildBetaInterestNotification(input: { email: string; interest?: (typeof betaInterestOptions)[number] }) {
  return {
    title: "New MyGF.ai beta interest",
    content: [
      `Email: ${input.email}`,
      `What draws them here: ${input.interest ?? "Not specified"}`,
      "Source: prelaunch-landing",
    ].join("\n"),
  };
}

export async function submitBetaInterest(
  input: BetaInterestInput,
  dependencies: BetaInterestDependencies = defaultDependencies
) {
  const email = input.email.trim().toLowerCase();
  const interest = input.interest;
  const existing = await dependencies.findByEmail(email);

  if (existing) {
    return { status: "already_registered" as const, notificationSent: false };
  }

  await dependencies.create({ email, interest, source: "prelaunch-landing" });

  try {
    const notificationSent = await dependencies.notify(buildBetaInterestNotification({ email, interest }));
    return { status: "created" as const, notificationSent };
  } catch {
    console.warn("[BetaInterest] Owner notification did not complete");
    return { status: "created" as const, notificationSent: false };
  }
}
