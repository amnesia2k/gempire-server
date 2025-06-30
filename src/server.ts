import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { db } from "./db";
import { sql } from "drizzle-orm";

// 🌟 Rate limiting imports
import { rateLimit } from "express-rate-limit";
import { RedisStore, RedisReply } from "rate-limit-redis";
import RedisClient from "ioredis";

const app = express();
const PORT = process.env.PORT || 8000;

// 🧭 Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🚨 Redis client with event listeners for connection health
const redis = new RedisClient({
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === "true" ? {} : undefined, // Upstash requires TLS
});

redis.on("connect", () => console.log("🔌 Redis connected"));
redis.on("error", (err) => console.error("⚠️ Redis error:", err));
redis.on("end", () => console.warn("⚠️ Redis connection closed"));

// 🛡️ Rate limiter with Redis store fallback (basic no-limit if Redis down)
let limiterMiddleware: express.RequestHandler = (req, res, next) => next();

try {
  const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 requests max per IP per window
    standardHeaders: true,
    legacyHeaders: false,

    store: new RedisStore({
      sendCommand: (command: string, ...args: string[]): Promise<RedisReply> =>
        redis.call(command, ...args) as Promise<RedisReply>,
    }),

    handler: (req, res) => {
      res.status(429).json({
        message: "Too many requests – slow down, champ 🐢",
      });
    },
  });

  limiterMiddleware = limiter;
  console.log("✅ Rate limiter initialized with Redis");
} catch (err) {
  console.warn("⚠️ Redis rate limiter failed. Proceeding without limit.");
}

// 🧱 Core middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Apply rate limiter BEFORE routes
app.use("/api/v1", limiterMiddleware);

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
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("💥 Internal Server Error:", err.stack);
    res.status(500).json({ message: "Something broke!" });
  });
}

// 🚀 Start server and load routes
loadRoutesFlat().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}`);
  });

  // 💓 Neon keep-alive ping every 4 mins
  setInterval(() => {
    db.execute(sql`SELECT 1`)
      .then(() => console.log("💓 Keep-alive ping sent"))
      .catch((err) => console.error("💥 Keep-alive failed:", err.message));
  }, 240_000);
});

export default app;
