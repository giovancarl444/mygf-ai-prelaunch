import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  companions: [
    { worldSlug: "sienna-vale", displayName: "Sienna Vale", occupation: "Editor", age: 29, tagline: null as string | null },
    { worldSlug: "ava-marchetti", displayName: "Ava Marchetti", occupation: null, age: null, tagline: "Nights in Milan." },
  ],
}));

vi.mock("./ohapiDb", () => ({
  listPublishedOhapiCharacters: vi.fn(async () => state.companions),
  getPublishedOhapiCharacterBySlug: vi.fn(async (slug: string) =>
    state.companions.find(companion => companion.worldSlug === slug)),
}));

import { describePage, injectMeta, renderRobotsTxt, renderSitemapXml } from "./seo";

const BASE = "https://mygf.example";
const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="the shell description" />
    <meta property="og:title" content="the shell title" />
    <title>the shell title</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

beforeEach(() => {
  state.companions = [
    { worldSlug: "sienna-vale", displayName: "Sienna Vale", occupation: "Editor", age: 29, tagline: null },
    { worldSlug: "ava-marchetti", displayName: "Ava Marchetti", occupation: null, age: null, tagline: "Nights in Milan." },
  ];
});

/**
 * The single-page shell carries one title and one description for the whole
 * site, so every route is the same document until JavaScript runs. For a
 * product whose growth is meant to come from search, that is the difference
 * between having pages and having one page.
 */
describe("what a crawler is told about each route", () => {
  it("gives a companion her own title and description", async () => {
    const meta = await describePage("/companion/sienna-vale", BASE);

    expect(meta.title).toBe("Sienna Vale — AI companion on MyGF.ai");
    expect(meta.description).toContain("Sienna Vale");
    expect(meta.canonical).toBe("https://mygf.example/companion/sienna-vale");
    expect(meta.noindex).toBe(false);
  });

  it("prefers the tagline the owner wrote", async () => {
    const meta = await describePage("/companion/ava-marchetti", BASE);
    expect(meta.description).toBe("Nights in Milan.");
  });

  it("describes a companion as a person, for the result snippet", async () => {
    const meta = await describePage("/companion/sienna-vale", BASE);
    expect(meta.jsonLd).toMatchObject({
      "@type": "ProfilePage",
      mainEntity: { "@type": "Person", name: "Sienna Vale", jobTitle: "Editor" },
    });
  });

  it("lists the catalog as an ordered collection", async () => {
    const meta = await describePage("/companions", BASE);
    expect(meta.title).toBe("Browse AI companions — MyGF.ai");
    expect(meta.jsonLd).toMatchObject({
      "@type": "CollectionPage",
      mainEntity: { numberOfItems: 2 },
    });
    // Position is 1-indexed; a list starting at 0 is discarded without comment.
    const list = (meta.jsonLd as { mainEntity: { itemListElement: { position: number }[] } }).mainEntity;
    expect(list.itemListElement.map(item => item.position)).toEqual([1, 2]);
  });

  /**
   * A customer's conversation appearing in search results would be a serious
   * privacy failure, so anything not explicitly public is excluded.
   */
  it.each(["/chat", "/chat/sienna-vale", "/ops/ohapi", "/something-else"])(
    "keeps %s out of the index",
    async pathname => {
      expect((await describePage(pathname, BASE)).noindex).toBe(true);
    },
  );

  it("keeps an unknown companion out of the index", async () => {
    expect((await describePage("/companion/not-a-real-slug", BASE)).noindex).toBe(true);
  });

  it("survives a database that is not answering", async () => {
    const db = await import("./ohapiDb");
    vi.mocked(db.listPublishedOhapiCharacters).mockRejectedValueOnce(new Error("down"));
    const meta = await describePage("/companions", BASE);
    expect(meta.noindex).toBe(false);
    expect(meta.title).toContain("Browse AI companions");
  });
});

describe("rewriting the shell", () => {
  it("replaces the shell's title rather than adding a second one", async () => {
    const html = injectMeta(SHELL, await describePage("/companion/sienna-vale", BASE));

    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain("<title>Sienna Vale — AI companion on MyGF.ai</title>");
    expect(html).not.toContain("the shell title");
  });

  it("leaves exactly one description and one og:title", async () => {
    const html = injectMeta(SHELL, await describePage("/", BASE));
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html).not.toContain("the shell description");
  });

  it("keeps the application shell intact", async () => {
    const html = injectMeta(SHELL, await describePage("/", BASE));
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain("<meta charset=\"UTF-8\" />");
  });

  it("escapes a companion name that contains markup", async () => {
    state.companions = [{ worldSlug: "x", displayName: '<script>alert("x")</script>', occupation: null, age: null, tagline: null }];
    const html = injectMeta(SHELL, await describePage("/companion/x", BASE));
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("marks private routes noindex in the markup", async () => {
    const html = injectMeta(SHELL, await describePage("/chat/sienna-vale", BASE));
    expect(html).toContain('content="noindex, nofollow"');
  });
});

/**
 * Both of these previously answered with the HTML shell and a 200, because the
 * single-page catch-all matched them. A crawler asking for a text file and
 * receiving a webpage is worse than a 404, and it made any submitted sitemap
 * invalid.
 */
describe("the files a crawler asks for by name", () => {
  it("points robots.txt at the sitemap and keeps private routes out", () => {
    const robots = renderRobotsTxt(BASE);
    expect(robots).toContain("Sitemap: https://mygf.example/sitemap.xml");
    expect(robots).toContain("Disallow: /chat");
    expect(robots).toContain("Disallow: /ops");
  });

  it("lists every published companion in the sitemap", async () => {
    const sitemap = await renderSitemapXml(BASE);
    expect(sitemap).toContain("<loc>https://mygf.example</loc>");
    expect(sitemap).toContain("<loc>https://mygf.example/companions</loc>");
    expect(sitemap).toContain("<loc>https://mygf.example/companion/sienna-vale</loc>");
    expect(sitemap).toContain("<loc>https://mygf.example/companion/ava-marchetti</loc>");
    expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it("still returns a valid sitemap when the catalog is empty", async () => {
    state.companions = [];
    const sitemap = await renderSitemapXml(BASE);
    expect(sitemap).toContain("<urlset");
    expect(sitemap).toContain("</urlset>");
  });
});
