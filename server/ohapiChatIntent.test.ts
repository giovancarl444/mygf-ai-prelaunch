import { describe, expect, it } from "vitest";
import { detectChatMediaRequest } from "./ohapiChatIntent";

/**
 * The cost of the two mistakes is not symmetric. Missing a request means the
 * customer asks again. Inventing one spends their hourly allowance and real
 * provider credit on something they did not want, in a thread they cannot undo.
 * These cases are written to hold that asymmetry in place.
 */
describe("recognising a request for media in conversation", () => {
  it.each([
    ["can you send me a picture?", "image"],
    ["send me a photo of you", "image"],
    ["send a pic babe", "image"],
    ["take a selfie for me", "image"],
    ["i want a selfie", "image"],
    ["would love to see a photo of you right now", "image"],
    ["show me a picture of where you are", "image"],
    ["gimme a pic", "image"],
    ["Send Me A PHOTO", "image"],
    ["send me a video", "video"],
    ["can you take a quick vid", "video"],
    ["share a clip of that", "video"],
    ["send me a voice note", "audio"],
    ["can i hear your voice", "audio"],
    ["send a voice message please", "audio"],
    ["record a voice memo for me", "audio"],
  ] as const)("reads %j as a request for %s", (message, kind) => {
    expect(detectChatMediaRequest(message)).toBe(kind);
  });

  it("takes the medium named first when a message mentions two", () => {
    expect(detectChatMediaRequest("send me a photo, or a video if you'd rather")).toBe("image");
    expect(detectChatMediaRequest("send me a video, and a pic after")).toBe("video");
  });

  it.each([
    "hey how was your day",
    "what do you look like",
    "i love that picture you sent",
    "that pic made me want to talk to you",
    "the photo is still my wallpaper",
    "your selfie was unreal",
    "don't send any more pics",
    "i'd rather not see a photo right now",
    "picture this: we're in rome",
    "you sent me a photo yesterday right",
  ])("leaves %j as ordinary conversation", message => {
    expect(detectChatMediaRequest(message)).toBeNull();
  });

  it("needs the ask to come before the medium", () => {
    // The word "send" is present, but it is not what the photo is being asked for.
    expect(detectChatMediaRequest("the photo reminded me, send my love to your sister")).toBeNull();
  });

  it("ignores empty and whitespace-only messages", () => {
    expect(detectChatMediaRequest("")).toBeNull();
    expect(detectChatMediaRequest("   \n  ")).toBeNull();
  });
});
