import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerAuthRoutes } from "../auth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";
import { registerSeoRoutes } from "../seo";
import path from "path";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  // Nothing gains from telling every visitor which framework to look up
  // advisories for.
  app.disable("x-powered-by");
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  // Our own sign-in. Mounted alongside the platform's OAuth callback rather
  // than replacing it, so accounts created before the move keep working while
  // people migrate across.
  registerAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // What a crawler sees. Mounted before the single-page handlers, which
  // otherwise answer every path — including /robots.txt — with the HTML shell.
  const isDevelopment = process.env.NODE_ENV === "development";
  // Resolved once. The metadata handler and the static handler both need it,
  // and working it out twice is how one of them ends up looking somewhere else.
  const distPath = isDevelopment
    ? path.resolve(import.meta.dirname, "../..", "dist", "public")
    : path.resolve(import.meta.dirname, "public");
  const sendShell = registerSeoRoutes(app, { enabled: !isDevelopment, distPath });

  // development mode uses Vite, production mode uses static files
  if (isDevelopment) {
    // Loaded on demand, and kept out of the production bundle by the build.
    // Vite is a development dependency and is absent from the server's install;
    // as a static import Node would resolve it before running any of this and
    // exit, which is precisely how the first deploy crash-looped.
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    // The metadata handler *is* the single-page fallback. Handing it to
    // serveStatic rather than mounting it earlier is what stops a route from
    // silently bypassing it.
    serveStatic(app, { distPath, sendShell });
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
