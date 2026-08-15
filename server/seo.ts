import type { Express, Request, RequestHandler } from "express";
import fs from "node:fs";
import path from "node:path";
import { getPublishedOhapiCharacterBySlug, listPublishedOhapiCharacters } from "./ohapiDb";

/**
 * What a crawler sees.
 *
 * The client is a single-page app: every route returns the same HTML shell and
 * the page is assembled in the browser. That is fine for a customer and close
 * to useless for search, because the shell carries one title and one
 * description for the entire site — a companion's page and the landing page are
 * the same document until JavaScript runs.
 *
 * This is not server-side rendering and does not try to be. It rewrites the
 * head of the shell per route before it is sent, so the parts that decide how a
 * page is indexed and how it looks when shared are correct on the first byte.
 * The body still hydrates client-side as before.
 */

const SITE_NAME = "MyGF.ai";
const DEFAULT_TITLE = "MyGF.ai — Private AI companions";
const DEFAULT_DESCRIPTION =
  "Private conversations with AI companions. Ask for photos, voice notes, and video in the chat itself. Adults only, 18+.";

/**
 * The public origin, resolved rather than hard-coded.
 *
 * Set `PUBLIC_BASE_URL` once a real domain exists. Until then this follows
 * whatever host served the request, so nothing has to be rewritten when the
 * domain changes — and no canonical ever points at a hostname the site has
 * already moved off.
 */
export function resolveBaseUrl(req: Request) {
  const configured = process.env.PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0] ?? req.protocol;
  return `${proto}://${req.get("host")}`;
}

export type PageMeta = {
  title: string;
  description: string;
  canonical: string;
  image: string | null;
  /** Kept off search results entirely — private, owner-only, or transactional. */
  noindex: boolean;
  jsonLd: Record<string, unknown> | null;
};

function truncate(value: string, limit: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= limit ? clean : `${clean.slice(0, limit - 1).trimEnd()}…`;
}

/**
 * Describes one route.
 *
 * Only the public surface is described. Everything else is explicitly excluded
 * from search rather than left to chance: a customer's conversation must never
 * be indexable, and neither must the owner's studio.
 */
export async function describePage(pathname: string, baseUrl: string): Promise<PageMeta> {
  const canonical = `${baseUrl}${pathname === "/" ? "" : pathname}`;
  const base: PageMeta = {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonical,
    image: null,
    noindex: false,
    jsonLd: null,
  };

  if (pathname === "/") {
    return {
      ...base,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: baseUrl,
        description: DEFAULT_DESCRIPTION,
      },
    };
  }

  if (pathname === "/companions") {
    const companions = await listPublishedOhapiCharacters().catch(() => []);
    return {
      ...base,
      title: `Browse AI companions — ${SITE_NAME}`,
      description: truncate(
        companions.length
          ? `${companions.length} AI companions to talk to privately. Open a conversation and ask for photos, voice notes, and video. 18+.`
          : DEFAULT_DESCRIPTION,
        300,
      ),
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `AI companions on ${SITE_NAME}`,
        url: canonical,
        // Position is 1-indexed; a list that starts at 0 is silently dropped.
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: companions.length,
          itemListElement: companions.slice(0, 50).map((companion, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${baseUrl}/companion/${companion.worldSlug}`,
            name: companion.displayName,
          })),
        },
      },
    };
  }

  const companionMatch = /^\/companion\/([a-z0-9-]+)$/.exec(pathname);
  if (companionMatch) {
    const companion = await getPublishedOhapiCharacterBySlug(companionMatch[1]).catch(() => undefined);
    // An unpublished or unknown companion is a 404 as far as search is
    // concerned, whatever the shell renders.
    if (!companion) return { ...base, noindex: true };

    const descriptor = [companion.occupation, companion.age ? `${companion.age}` : null]
      .filter(Boolean)
      .join(", ");
    const description = truncate(
      companion.tagline
        ?? `Talk privately with ${companion.displayName}${descriptor ? `, ${descriptor}` : ""}. `
          + "Ask her for photos, voice notes, and video in the conversation itself. 18+.",
      300,
    );

    return {
      ...base,
      title: `${companion.displayName} — AI companion on ${SITE_NAME}`,
      description,
      // The portrait is a presigned URL that expires in an hour, so it is not
      // usable as a durable share image. Left off rather than shipped broken.
      image: null,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        url: canonical,
        name: companion.displayName,
        description,
        mainEntity: {
          "@type": "Person",
          name: companion.displayName,
          ...(companion.occupation ? { jobTitle: companion.occupation } : {}),
          description,
        },
      },
    };
  }

  // Conversations, the studio, and anything unrecognised. A customer's thread
  // being indexed would be a serious privacy failure, so the default is out.
  return { ...base, noindex: true };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Rewrites the shell's head for one route.
 *
 * The shell's own title and description are removed first, so a page never
 * ships two of either — search engines pick one and it is not always yours.
 */
export function injectMeta(html: string, meta: PageMeta) {
  const stripped = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/<meta\s+name="description"[^>]*>\s*/i, "")
    .replace(/<meta\s+property="og:(?:title|description|type|url|image)"[^>]*>\s*/gi, "");

  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
    meta.noindex ? `<meta name="robots" content="noindex, nofollow" />` : `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`,
    meta.image ? `<meta property="og:image" content="${escapeHtml(meta.image)}" />` : "",
    `<meta name="twitter:card" content="${meta.image ? "summary_large_image" : "summary"}" />`,
    meta.jsonLd ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, "\\u003c")}</script>` : "",
  ].filter(Boolean).join("\n    ");

  return stripped.replace(/<\/head>/i, `  ${tags}\n  </head>`);
}

/**
 * `robots.txt`, served as a real file.
 *
 * Without this the single-page catch-all answers `/robots.txt` with the HTML
 * shell, `200 text/html` — which is worse than a 404, because a crawler asked
 * for a text file and was handed a webpage. The same applied to the sitemap,
 * which made any submitted sitemap invalid.
 */
export function renderRobotsTxt(baseUrl: string) {
  return [
    "User-agent: *",
    // Private and owner-only surfaces. Disallow is not a security control —
    // those are enforced server-side — it keeps them out of the index.
    "Disallow: /chat",
    "Disallow: /ops",
    "Disallow: /api",
    "Allow: /",
    "",
    `Sitemap: ${baseUrl}/sitemap.xml`,
    "",
  ].join("\n");
}

export async function renderSitemapXml(baseUrl: string) {
  const companions = await listPublishedOhapiCharacters().catch(() => []);
  const entries = [
    { loc: baseUrl, priority: "1.0", changefreq: "daily" },
    { loc: `${baseUrl}/companions`, priority: "0.9", changefreq: "daily" },
    ...companions.map(companion => ({
      loc: `${baseUrl}/companion/${companion.worldSlug}`,
      priority: "0.8",
      changefreq: "weekly",
    })),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(entry => [
      "  <url>",
      `    <loc>${escapeHtml(entry.loc)}</loc>`,
      `    <changefreq>${entry.changefreq}</changefreq>`,
      `    <priority>${entry.priority}</priority>`,
      "  </url>",
    ].join("\n")),
    "</urlset>",
    "",
  ].join("\n");
}

/**
 * Registers the files a crawler asks for by name, and returns the handler that
 * serves every HTML page.
 *
 * The returned handler replaces the single-page catch-all rather than sitting
 * in front of it. An earlier version mounted `["/", "/companions",
 * "/companion/:slug"]` explicitly and let everything else fall through to the
 * static handler, which meant any route not on that list was served the
 * unmodified shell — carrying no `robots` tag at all. `describePage` defaults
 * those routes to `noindex`, and that default was unreachable in production for
 * the entire time it existed.
 *
 * A list of routes to keep in sync is the bug. There is one HTML entry point
 * now, and `describePage` decides what each path is told.
 */
/**
 * The path as the visitor asked for it.
 *
 * `req.path` is relative to where the handler is mounted, and this one is
 * mounted as the catch-all — so `req.path` is `/` for every request that
 * reaches it, and every page would be described as the landing page. A
 * trailing slash is removed so `/companions/` is not a second URL with its own
 * canonical.
 */
function requestedPathname(req: Request): string {
  const raw = (req.originalUrl || req.url || "/").split(/[?#]/)[0];
  return raw.length > 1 && raw.endsWith("/") ? raw.slice(0, -1) : raw || "/";
}

export function registerSeoRoutes(app: Express, options: { distPath: string; enabled: boolean }) {
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain").send(renderRobotsTxt(resolveBaseUrl(req)));
  });

  app.get("/sitemap.xml", async (req, res) => {
    try {
      res.type("application/xml").send(await renderSitemapXml(resolveBaseUrl(req)));
    } catch (error) {
      console.error("[SEO] The sitemap could not be built:", error);
      res.status(503).type("text/plain").send("Sitemap temporarily unavailable.");
    }
  });

  // In development Vite owns the HTML pipeline and search does not see it.
  if (!options.enabled) return undefined;

  // The static handler would otherwise answer this with the shell as a plain
  // file, giving `/` a duplicate that carries no canonical pointing home.
  app.get("/index.html", (_req, res) => res.redirect(301, "/"));

  const shellPath = path.resolve(options.distPath, "index.html");
  const sendShell: RequestHandler = async (req, res, next) => {
    try {
      const shell = await fs.promises.readFile(shellPath, "utf-8");
      const meta = await describePage(requestedPathname(req), resolveBaseUrl(req));
      res.type("text/html").send(injectMeta(shell, meta));
    } catch (error) {
      // Never let metadata be the reason a page does not load.
      console.error("[SEO] Falling back to the unmodified shell:", error);
      next(error);
    }
  };

  return sendShell;
}
