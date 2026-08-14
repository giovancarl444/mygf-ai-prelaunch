import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const pilot = readFileSync(new URL("../client/src/pages/Pilot.tsx", import.meta.url), "utf8");
const main = readFileSync(new URL("../client/src/main.tsx", import.meta.url), "utf8");

describe("live private access regression guard", () => {
  it("keeps pre-launch interest capture off the public landing page", () => {
    expect(home).not.toContain("betaInterest.submit");
    expect(home).not.toContain("Request beta access");
    expect(home).not.toContain("Private beta applications");
    expect(home).toContain('href="/pilot"');
    expect(home).toContain("Start a private thread");
    expect(home).toContain("Sign in to begin privately.");
  });

  it("shows an explicit branded account gate before initiating OAuth", () => {
    expect(pilot).toContain("useAuth()");
    expect(pilot).not.toContain("useAuth({ redirectOnUnauthenticated: true })");
    expect(pilot).toContain("Your private thread");
    expect(pilot).toContain("Sign in to continue");
    expect(pilot).toContain("startLogin()");
    expect(main).not.toContain("redirectToLoginIfUnauthorized");
    expect(main).not.toContain('import { startLogin } from "./const"');
  });
});
