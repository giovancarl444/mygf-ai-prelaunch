import fs from "fs";
import { type Express } from "express";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

/**
 * The development server. **Nothing may import this statically.**
 *
 * Vite and the Vite config are development dependencies, so they do not exist
 * on the server. Node resolves static imports before executing anything, which
 * means a static import here is loaded even on the production path that never
 * calls it — and the process exits with ERR_MODULE_NOT_FOUND before serving a
 * request. `server/_core/index.ts` therefore reaches this through
 * `await import("./vite")` inside the development branch, and the build marks
 * the module external so it stays out of `dist/index.js` entirely.
 *
 * `serveStatic` is the production counterpart and lives in `./static`, which
 * imports none of this.
 */
export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
