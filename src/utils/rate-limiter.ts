import rateLimit from 'express-rate-limit'
import { NextFunction, Request, Response } from 'express'
import { logger } from './logger'

export const createRateLimiter = (keyPrefix: string, maxTries: number) => {
  try {
    logger.info('✅ Rate limiter initialized (in-memory)')

    return rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: maxTries,
      keyGenerator: (req: Request) => {
        const ip = req.ip
        const path = req.originalUrl.split('?')[0]
        return `${keyPrefix}:${ip}:${path}`
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          message: `Too many requests – slow down and try again in 5 minutes`,
        })
      },
    })
  } catch (err) {
    logger.warn('⚠️ Rate limiter failed. Proceeding without limit.')
    logger.error(err)
    return (_req: Request, _res: Response, next: NextFunction) => next()
  }
}

// import { rateLimit } from "express-rate-limit";
// import { RedisStore, RedisReply } from "rate-limit-redis";
// import redis from "./redis";
// import { Request, Response } from "express";
// import { logger } from "./logger";

// export const createRateLimiter = (keyPrefix: string, maxTries: number) => {
//   try {
//     logger.info("✅ Rate limiter initialized with Redis");

//     return rateLimit({
//       windowMs: 5 * 60 * 1000, // 5 minutes
//       max: maxTries,
//       keyGenerator: (req: Request) => {
//         const ip = req.ip;
//         const path = req.originalUrl.split("?")[0];
//         return `${keyPrefix}:${ip}:${path}`;
//       },
//       store: new RedisStore({
//         sendCommand: (
//           command: string,
//           ...args: string[]
//         ): Promise<RedisReply> =>
//           redis.call(command, ...args) as Promise<RedisReply>,
//       }),
//       standardHeaders: true,
//       legacyHeaders: false,
//       handler: async (req: Request, res: Response) => {
//         try {
//           const ip = req.ip;
//           const path = req.originalUrl.split("?")[0];
//           const key = `${keyPrefix}:${ip}:${path}`;

//           let ttlSeconds = await redis.ttl(key);

//           // If TTL is -2 (key doesn't exist) or -1 (no expiration), fallback to windowMs
//           if (ttlSeconds < 0) {
//             ttlSeconds = 10 * 60; // fallback to 10 minutes
//           }

//           const minutes = Math.floor(ttlSeconds / 60);
//           const seconds = ttlSeconds % 60;

//           res.status(429).json({
//             message: `Too many requests – slow down and try again in 5 minutes`,
//             // message: `Too many requests – slow down and try again in ${minutes}m ${seconds}s`,
//             // retryAfterSeconds: ttlSeconds,
//           });
//         } catch (error) {
//           logger.error("Rate limit handler error:", error);
//           res.status(429).json({
//             message: `Too many requests – slow down and try again in 5 minutes`,
//           });
//         }
//       },
//     });
//   } catch (err) {
//     logger.warn("⚠️ Redis rate limiter failed. Proceeding without limit.");
//     logger.error(err);
//     return (_req: Request, _res: Response, next: Function) => next();
//   }
// };
