import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import app from "./server/app";
import dotenv from "dotenv";

// Load .env.local first if it exists, otherwise fall back to .env
const localEnvPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config();
}

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

  // Vite Integration for static assets or SPA serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA Fallback: Serve index.html for all other routers to support frontend navigation reload
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`simplesphere Full-Stack Server listening at http://localhost:${PORT}`);
  });
}

startServer();
