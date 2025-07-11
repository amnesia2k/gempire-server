import { rateLimit } from "express-rate-limit";
import { RedisStore, RedisReply } from "rate-limit-redis";
import redis from "./redis";
import { Request, Response } from "express";
import logger from "./logger";

export const createRateLimiter = (keyPrefix: string, maxTries: number) => {
  try {
    logger.info("✅ Rate limiter initialized with Redis");

    return rateLimit({
      windowMs: 10 * 60 * 1000,
      max: maxTries,
      keyGenerator: (req: Request) => {
        const ip = req.ip;
        const path = req.originalUrl.split("?")[0];
        return `${keyPrefix}:${ip}:${path}`;
      },
      store: new RedisStore({
        sendCommand: (
          command: string,
          ...args: string[]
        ): Promise<RedisReply> =>
          redis.call(command, ...args) as Promise<RedisReply>,
      }),
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req: Request, res: Response) => {
        res.status(429).json({
          message: `Too many requests – slow down and try again in 10 minutes`,
        });
      },
    });
  } catch (err) {
    logger.warn("⚠️ Redis rate limiter failed. Proceeding without limit.");
    logger.error(err);
    return (_req: Request, _res: Response, next: Function) => next();
  }
};

// // src/config/rateLimiter.ts
// import { rateLimit } from "express-rate-limit";
// import { RedisStore, RedisReply } from "rate-limit-redis";
// import redis from "./redis";
// import { NextFunction, Request, Response } from "express";

// let limiterMiddleware = (req: Request, res: Response, next: NextFunction) =>
//   next();

// try {
//   const limiter = rateLimit({
//     windowMs: 10 * 60 * 1000,
//     max: 15,
//     standardHeaders: true,
//     legacyHeaders: false,
//     skipSuccessfulRequests: true,

//     keyGenerator: (req: Request) => {
//       const ip = req.ip;
//       const path = req.originalUrl.split("?")[0];

//       return `${keyPrefix}`
//     },

//     store: new RedisStore({
//       sendCommand: (command: string, ...args: string[]): Promise<RedisReply> =>
//         redis.call(command, ...args) as Promise<RedisReply>,
//     }),

//     handler: (req, res) => {
//       res.status(429).json({
//         message: "Too many requests – slow down, champ 🐢",
//       });
//     },
//   });

//   limiterMiddleware = limiter;
//   logger.info("✅ Rate limiter initialized with Redis");
// } catch (err) {
//   logger.warn("⚠️ Redis rate limiter failed. Proceeding without limit.");
//   logger.error(err);
// }

// export { limiterMiddleware };
