/**
 * Recognising a customer in crisis, and getting out of the way.
 *
 * **The asymmetry here is the opposite of everywhere else in this codebase.**
 * The media detector under-triggers on purpose, because a false positive spends
 * someone's money. This over-triggers on purpose, because a false negative
 * means a person said something serious and a piece of software flirted back.
 * An unnecessary interruption is an annoyance. The other mistake is not.
 *
 * This is a floor, not a ceiling. It is a fixed vocabulary: it will miss
 * indirect phrasing, other languages, and anything it has not been taught. It
 * is not a substitute for review, and it should not be described to anyone as
 * one.
 */

/**
 * English uses the vocabulary of dying constantly without meaning any of it.
 * These spans are removed before the scan rather than vetoing the whole
 * message, so "I'm dying to tell you I want to kill myself" still trips.
 */
const FIGURES_OF_SPEECH: readonly RegExp[] = [
  /\bdying (?:to|for)\b/g,
  /\bto die for\b/g,
  /\bdie of (?:embarrassment|laughter|boredom|shame)\b/g,
  /\b(?:could|would) (?:just )?die\b/g,
  /\bkilling me(?: softly| slowly)?\b/g,
  /\b(?:kill|killed|killing) it\b/g,
  /\bkill me now\b/g,
  /\bdead (?:tired|serious|set|end|line|weight)\b/g,
  /\bdrop dead gorgeous\b/g,
  /\bsuicide squad\b/g,
  /\bsuicide (?:prevention|hotline|helpline|lifeline)\b/g,
  /\bhalf to death\b/g,
  /\bscared to death\b/g,
  /\bsick to death\b/g,
];

/**
 * Said plainly, these are not turns of phrase. The set leans toward direct
 * constructions because those are the ones that can be matched without
 * drowning ordinary conversation in interruptions.
 *
 * Reflexives other than the first person are included: someone disclosing that
 * a friend is suicidal needs the same numbers, and the cost of handing them
 * over to a person who did not need them is nothing.
 */
const REFLEXIVE = "(?:my|him|her|them|one)\\s?sel(?:f|ves)";

const CRISIS_PATTERNS: readonly RegExp[] = [
  new RegExp(`\\bkill(?:ing)? ${REFLEXIVE}\\b`),
  new RegExp(`\\bhang(?:ing)? ${REFLEXIVE}\\b`),
  new RegExp(`\\b(?:hurt|harm)(?:ing)? ${REFLEXIVE}\\b`),
  new RegExp(`\\bcut(?:ting)? ${REFLEXIVE}\\b`),
  new RegExp(`\\boverdos(?:e|ing) (?:on|${REFLEXIVE})\\b`),
  /\btake (?:my|his|her|their) own life\b/,
  /\bend (?:my|his|her|their) (?:own )?life\b/,
  /\bend(?:ing)? it all\b/,
  /\bwant(?:s|ed)? to die\b/,
  /\bwanna die\b/,
  /\bwish(?:ed)? (?:i|he|she|they) (?:was|were) dead\b/,
  /\bbetter off dead\b/,
  /\bbetter off without me\b/,
  /\bdo(?:n'?t| not) want to (?:live|be alive|be here|wake up|exist)\b/,
  /\bno (?:reason|point) (?:to|in) (?:living|being here|going on)\b/,
  /\bnot worth living\b/,
  /\bsuicidal?\b/,
  /\bself[- ]harm\b/,
];

export function detectCrisisLanguage(message: string): boolean {
  let text = message.toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return false;
  for (const figure of FIGURES_OF_SPEECH) text = text.replace(figure, " ");
  return CRISIS_PATTERNS.some(pattern => pattern.test(text));
}

export type CrisisResource = { where: string; contact: string };

/**
 * Deliberately not US-only. Someone reaching a number that does not serve them
 * is the same failure as reaching no number at all.
 */
export const CRISIS_RESOURCES: readonly CrisisResource[] = [
  { where: "United States", contact: "Call or text 988" },
  { where: "United Kingdom & Ireland", contact: "Call 116 123 (Samaritans)" },
  { where: "Anywhere", contact: "findahelpline.com" },
];

/**
 * The reply, written to break the fiction rather than maintain it.
 *
 * Having the companion answer this in character would be the worst available
 * option: it would be a piece of software, that the customer is paying to feel
 * close to, presenting itself as competent to help. The product says who it is
 * instead, and points somewhere real.
 */
export const CRISIS_RESPONSE = [
  "This is MyGF.ai, not your companion. What you just said matters more than anything happening in this chat, so I am stepping in directly.",
  "",
  "If you are thinking about hurting yourself, please talk to a person who can actually help:",
  ...CRISIS_RESOURCES.map(resource => `· ${resource.where} — ${resource.contact}`),
  "",
  "If you are in immediate danger, call your local emergency number.",
  "",
  "I am not going to pretend to be someone who can carry this with you. Someone can, and they are there right now. Your conversation is still here whenever you want to come back to it.",
].join("\n");
