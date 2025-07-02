import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { db } from "./db";
import { sql } from "drizzle-orm";

const app = express();
const PORT = process.env.PORT || 8000;

// 🧭 Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("trust proxy", 1);

// 🧱 Core middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// 🗜️ Add GZIP compression (with smart client opt-out filter)
app.use(
  compression({
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;

      req.headers["accept-encoding"] = "gzip";
      return compression.filter(req, res);
    },
  })
);

// 🧠 Dynamic route loader (flat)
async function loadRoutesFlat() {
  const routesDir = path.join(__dirname, "routes");

  const routeFiles = fs
    .readdirSync(routesDir)
    .filter((f) => f.endsWith(".ts") || f.endsWith(".js"));

  for (const file of routeFiles) {
    try {
      const filePath = path.join(routesDir, file);
      const mod = await import(pathToFileURL(filePath).href);
      const router = mod.default;

      if (typeof router !== "function") {
        console.warn(`⚠️ Skipped ${file} (no default export router)`);
        continue;
      }

      app.use("/api/v1", router);
      console.log(`✅ Mounted routes from ${file} at /api/v1`);
    } catch (err) {
      console.error(`❌ Error loading ${file}:`, err);
    }
  }

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      message: "Not Found",
      url: req.originalUrl,
    });
  });

  // 500 handler
  app.use((err: Error, _req: Request, res: Response) => {
    console.error("💥 Internal Server Error:", err.stack);
    res.status(500).json({ message: "Something broke!", status: 500 });
  });
}

// 🚀 Start server and load routes
loadRoutesFlat().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}`);
  });

  // 💓 db keep-alive ping every 4 mins
  setInterval(() => {
    db.execute(sql`SELECT 1`)
      .then(() => console.log("💓 Keep-alive ping sent"))
      .catch((err) => console.error("💥 Keep-alive failed:", err.message));
  }, 240_000);
});

export default app;
