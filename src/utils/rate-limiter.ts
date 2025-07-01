// src/config/rateLimiter.ts
import { rateLimit } from "express-rate-limit";
import { RedisStore, RedisReply } from "rate-limit-redis";
import redis from "./redis";
import { NextFunction, Request, Response } from "express";

let limiterMiddleware = (req: Request, res: Response, next: NextFunction) =>
  next();

try {
  const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 15,
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
  console.error(err);
}

export { limiterMiddleware };
