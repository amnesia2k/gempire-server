// src/config/rateLimiter.ts
import { rateLimit } from "express-rate-limit";
import { RedisStore, RedisReply } from "rate-limit-redis";
import redis from "./redis"; // Import the single Redis client instance
import { NextFunction, Request, Response } from "express";

let limiterMiddleware = (req: Request, res: Response, next: NextFunction) =>
  next();

try {
  const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // 50 requests max per IP per window
    standardHeaders: true,
    legacyHeaders: false,

    store: new RedisStore({
      // Ensure the command signature matches ioredis's .call method
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
  console.error(err); // Log the actual error for debugging
}

export { limiterMiddleware };
