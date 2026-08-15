import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, type Server } from "node:http";
import express from "express";

const state = vi.hoisted(() => ({
  companions: [
    { worldSlug: "sienna-vale", displayName: "Sienna Vale", occupation: "Editor", age: 29, tagline: null as string | null },
  ],
}));

vi.mock("./ohapiDb", () => ({
  listPublishedOhapiCharacters: vi.fn(async () => state.companions),
  getPublishedOhapiCharacterBySlug: vi.fn(async (slug: string) =>
    state.companions.find(companion => companion.worldSlug === slug)),
}));

const { registerSeoRoutes } = await import("./seo");
const { serveStatic } = await import("./_core/static");

/**
 * These go over a real socket because the defect they exist for was invisible
 * from anywhere else.
 *
 * `describePage` and `injectMeta` were covered thoroughly and correctly, and
 * every one of those tests passed while production served `/chat` the raw
 * shell — no title of its own and, more to the point, no `robots` tag, because
 * the handler was mounted on a list of three routes and nothing else reached
 * it. The units were right. The wiring was not, and only an actual request
 * through the actual middleware stack can tell the difference.
 */

const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="the shell description" />
    <title>the shell title</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

let server: Server;
let origin: string;

beforeAll(async () => {
  const distPath = mkdtempSync(join(tmpdir(), "seo-routes-"));
  writeFileSync(join(distPath, "index.html"), SHELL);
  mkdirSync(join(distPath, "assets"));
  writeFileSync(join(distPath, "assets", "index-abc123.js"), "console.log(1);\n");

  const app = express();
  const sendShell = registerSeoRoutes(app, { distPath, enabled: true });
  serveStatic(app, { distPath, sendShell });

  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  origin = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
});

afterAll(() => new Promise<void>(resolve => { server.close(() => resolve()); }));

const get = (path: string) => fetch(`${origin}${path}`, { redirect: "manual" });

describe("every HTML route actually reaches the metadata handler", () => {
  it.each([
    ["/", "MyGF.ai"],
    ["/companions", "companions"],
    ["/companion/sienna-vale", "Sienna Vale"],
  ])("gives %s a title of its own", async (path, expected) => {
    const html = await (await get(path)).text();
    expect(html).toContain("<title>");
    expect(html).toMatch(new RegExp(`<title>[^<]*${expected}`, "i"));
    expect(html).not.toContain("the shell title");
  });

  /**
   * The regression itself. These routes are not in any list; the point is that
   * they no longer need to be.
   */
  it.each(["/chat", "/chat/sienna-vale", "/ops/ohapi", "/a-route-nobody-has-written-yet"])(
    "tells a crawler not to index %s",
    async path => {
      const html = await (await get(path)).text();
      expect(html).toContain('name="robots" content="noindex, nofollow"');
    },
  );

  it("never serves a page with no robots tag at all", async () => {
    for (const path of ["/", "/companions", "/companion/sienna-vale", "/chat", "/whatever"]) {
      expect(await (await get(path)).text()).toContain('name="robots"');
    }
  });

  it("treats a trailing slash as the same page, not a second one", async () => {
    const html = await (await get("/companions/")).text();
    expect(html).toContain('rel="canonical"');
    expect(html).toMatch(/rel="canonical" href="[^"]*\/companions"/);
  });

  it("gives each route a canonical pointing at itself", async () => {
    const html = await (await get("/companions")).text();
    expect(html).toContain('rel="canonical" href="http://127.0.0.1');
    expect(html).toContain("/companions");
  });
});

describe("what must not go through the shell handler", () => {
  it("serves a built asset as itself", async () => {
    const response = await get("/assets/index-abc123.js");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("console.log(1);\n");
  });

  it("answers robots.txt as text, not as the application", async () => {
    const response = await get("/robots.txt");
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toContain("Sitemap:");
  });

  it("answers the sitemap as XML", async () => {
    const response = await get("/sitemap.xml");
    expect(response.headers.get("content-type")).toContain("xml");
    expect(await response.text()).toContain("<urlset");
  });

  /**
   * Left alone, the static handler serves this as a file: a second copy of the
   * landing page, at a second URL, with no canonical pointing home.
   */
  it("sends /index.html home rather than serving a duplicate", async () => {
    const response = await get("/index.html");
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("/");
  });
});
