import { describe, expect, it } from "vitest";
import { CRISIS_RESPONSE, CRISIS_RESOURCES, detectCrisisLanguage } from "./ohapiCrisis";

/**
 * The two mistakes are not equal, and they are not equal in the direction the
 * rest of this codebase assumes. Interrupting a joke is an annoyance.
 * Answering a real disclosure with flirting is the worst thing this product
 * can do. These cases are written with that weighting.
 */
describe("recognising a customer in crisis", () => {
  it.each([
    "i want to kill myself",
    "i think about killing myself a lot",
    "sometimes i just want to die",
    "i wanna die",
    "everyone would be better off without me",
    "you'd all be better off dead honestly",
    "i don't want to be alive anymore",
    "i dont want to wake up tomorrow",
    "there's no point in going on",
    "life is not worth living",
    "i've been feeling suicidal",
    "i have been cutting myself again",
    "i hurt myself last night",
    "i've been thinking about self-harm",
    "i wish i was dead",
    "i want to end my life",
    "i'm going to end it all",
    "I WANT TO KILL MYSELF",
    "i   want  to   kill    myself",
  ])("interrupts %j", message => {
    expect(detectCrisisLanguage(message)).toBe(true);
  });

  /**
   * These are how people talk. Interrupting them constantly would train
   * customers to scroll past the one time it matters, which is the real cost
   * of over-triggering — not the annoyance itself.
   */
  it.each([
    "i'm dying to see you",
    "that dress is to die for",
    "this job is killing me",
    "you're killing me with these jokes",
    "i could die, that's so embarrassing",
    "i nearly died of laughter",
    "you killed it today",
    "ugh kill me now, monday again",
    "i'm dead tired",
    "she's drop dead gorgeous",
    "we watched suicide squad last night",
    "i volunteer at a suicide prevention line",
    "scared me half to death",
    "how was your day",
    "send me a photo",
  ])("leaves %j alone", message => {
    expect(detectCrisisLanguage(message)).toBe(false);
  });

  /**
   * A figure of speech in the same message must not shield the disclosure.
   * Idioms are stripped out, they do not veto the whole message.
   */
  it("still interrupts when a real disclosure sits next to an idiom", () => {
    expect(detectCrisisLanguage("i'm dying to tell you something. i want to kill myself.")).toBe(true);
    expect(detectCrisisLanguage("work is killing me and honestly i don't want to be alive")).toBe(true);
  });

  /**
   * Someone disclosing that a friend is in trouble needs the same numbers, and
   * handing them to a person who did not need them costs nothing.
   */
  it("interrupts when the person in crisis is someone else", () => {
    expect(detectCrisisLanguage("my brother said he wants to kill himself")).toBe(true);
    expect(detectCrisisLanguage("he said he wants to take his own life")).toBe(true);
    expect(detectCrisisLanguage("my sister has been cutting herself")).toBe(true);
  });

  it("ignores empty input", () => {
    expect(detectCrisisLanguage("")).toBe(false);
    expect(detectCrisisLanguage("   ")).toBe(false);
  });
});

describe("what the customer is told", () => {
  it("says plainly that this is not the companion speaking", () => {
    expect(CRISIS_RESPONSE).toContain("not your companion");
  });

  it("does not claim to be able to help", () => {
    expect(CRISIS_RESPONSE).toContain("not going to pretend");
  });

  it("reaches past the United States", () => {
    expect(CRISIS_RESOURCES.map(resource => resource.where)).toEqual(
      expect.arrayContaining(["United States", "United Kingdom & Ireland", "Anywhere"]),
    );
    expect(CRISIS_RESPONSE).toContain("988");
    expect(CRISIS_RESPONSE).toContain("116 123");
    expect(CRISIS_RESPONSE).toContain("findahelpline.com");
  });
});
