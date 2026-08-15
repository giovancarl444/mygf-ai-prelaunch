import express, { type Express, type RequestHandler } from "express";
import fs from "fs";
import path from "path";

/**
 * Serves the built client.
 *
 * This lives apart from `./vite` for one reason: that module imports Vite and
 * the Vite config, which are development dependencies and are not installed on
 * the server. Keeping the two in one file meant the production entry point
 * carried a static import of Vite, and Node resolves those before running a
 * line — so the service crash-looped on the first deploy with a module-not-found
 * error, having never reached the branch that decides which of the two to use.
 */
export function serveStatic(app: Express, options: { distPath: string; sendShell?: RequestHandler }) {
  const { distPath, sendShell } = options;
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // `index: false` is what routes `/` through the handler below rather than
  // having this answer it with the shell as a plain file. Every HTML response
  // then comes from one place, which is the only way the metadata for a route
  // can be guaranteed to have been applied to it.
  app.use(express.static(distPath, { index: false }));

  // fall through to index.html if the file doesn't exist
  app.use("*", sendShell ?? ((_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  }));
}
