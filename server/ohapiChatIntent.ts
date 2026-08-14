export type ChatMediaKind = "image" | "video" | "audio";

/**
 * The medium a message names, longest-lived spellings first. Order matters only
 * for readability; the earliest match in the sentence wins.
 */
const MEDIUMS: readonly { kind: ChatMediaKind; noun: RegExp }[] = [
  { kind: "audio", noun: /\b(?:voice ?(?:note|message|memo|clip|recording)s?|voicenotes?|audio (?:note|message|clip)s?|your voice)\b/ },
  { kind: "video", noun: /\b(?:videos?|vids?|clips?)\b/ },
  { kind: "image", noun: /\b(?:photos?|pics?|pictures?|selfies?|images?|snaps?)\b/ },
];

/** Verbs that turn a sentence into an ask rather than a remark. */
const ASKING = /\b(?:send|show|take|snap|share|post|text|see|hear|record|want|wanna|need|gimme|give)\w*\b/;

/**
 * Phrases that point back at media already in the conversation.
 *
 * Deliberately limited to demonstratives. "your photo" is not on this list,
 * because "send me your photo" is one of the most natural ways to ask; those
 * are separated instead by the rule that the ask must precede the medium.
 */
const REFERS_BACK = /\b(?:that|those|this|these|last)\s+(?:\w+\s+){0,2}(?:voice ?\w+|photos?|pics?|pictures?|selfies?|images?|videos?|vids?|clips?|snaps?)\b|\byou (?:just )?sent\b/;

/** Refusals. Reading one of these as a request would be the worse mistake. */
const DECLINES = /\b(?:don'?t|dont|do not|no|not|stop|never|rather not)\b[^.?!]{0,24}\b(?:send|show|take|share|voice|photos?|pics?|pictures?|selfies?|images?|videos?|vids?|clips?)\b/;

/**
 * Recognises a request for a photo, video, or voice note inside a chat message.
 *
 * Deliberately conservative. A false positive spends the customer's hourly
 * generation allowance and real provider credit on something nobody asked for,
 * so a message only counts when it both names the medium and asks for it, in
 * that order. Anything ambiguous is left as ordinary conversation.
 *
 * The provider also signals intent on the undocumented `tool_call` field of a
 * text reply. Once that field's shape has been observed against the live
 * service it should take precedence, and this becomes the fallback for replies
 * that carry no tool call.
 */
export function detectChatMediaRequest(message: string): ChatMediaKind | null {
  const text = message.toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return null;

  const asking = ASKING.exec(text);
  if (!asking) return null;
  if (REFERS_BACK.test(text) || DECLINES.test(text)) return null;

  // Earliest medium named wins, so "a photo, or maybe a video" asks for a photo.
  let named: { kind: ChatMediaKind; at: number } | null = null;
  for (const medium of MEDIUMS) {
    const found = medium.noun.exec(text);
    if (found && (!named || found.index < named.at)) named = { kind: medium.kind, at: found.index };
  }
  if (!named) return null;

  // The ask has to come before the medium. "send me a pic" is a request;
  // "the pic made me want to talk" only mentions one.
  return asking.index < named.at ? named.kind : null;
}
