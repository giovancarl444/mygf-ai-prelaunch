import express, { type Express } from "express";
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
export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
