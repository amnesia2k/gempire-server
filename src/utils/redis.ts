// import { createClient } from "redis";
// import { logger } from "./logger";

// const url =
//   process.env.REDIS_URL ??
//   `rediss://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
// const client = createClient({ url });

// client.on("connect", () => logger.info("🔌 Redis connected"));
// client.on("error", (err) =>
//   logger.error("⚠️ Redis connection error:", err.message)
// );
// client.on("end", () => logger.warn("⚠️ Redis connection closed"));
// client.on("reconnecting", () => logger.info("🔌 Redis reconnecting..."));
// client.on("ready", () => logger.info("🔌 Redis client ready"));

// await client.connect();
// export default client;

// // BullMQ options can reuse the same URL:
// export const redisOptions = { url };

import { createClient } from "redis";
import { logger } from "./logger";
import { env } from "./env";

const client = createClient({
  username: "default",
  password: env.REDIS_PASSWORD,
  socket: {
    host:
      env.REDIS_HOST ??
      "redis-15282.crce204.eu-west-2-3.ec2.redns.redis-cloud.com",
    port: Number(env.REDIS_PORT ?? 15282),
    // tls: true, // enable TLS since Redis Cloud expects TLS on its TLS port
  },
});

client.on("connect", () => logger.info("🔌 Redis connected"));
client.on("error", (err) =>
  logger.error("⚠️ Redis connection error:", err.message)
);
client.on("end", () => logger.warn("⚠️ Redis connection closed"));
client.on("reconnecting", () => logger.info("🔌 Redis reconnecting..."));
client.on("ready", () => logger.info("🔌 Redis client ready"));

await client.connect();
export default client;

export const redisOptions = {
  username: "default",
  password: env.REDIS_PASSWORD,
  socket: {
    host:
      env.REDIS_HOST ??
      "redis-15282.crce204.eu-west-2-3.ec2.redns.redis-cloud.com",
    port: Number(env.REDIS_PORT ?? 15282),
    // tls: true,
  },
};

// import RedisClient from "ioredis";
// import { logger } from "./logger";
// import { env } from "./env";

// const redisConfig = env.REDIS_URL
//   ? env.REDIS_URL
//   : {
//       host: env.REDIS_HOST || "127.0.0.1",
//       port: Number(env.REDIS_PORT ?? 6379),
//       password: env.REDIS_PASSWORD || undefined,
//       tls: env.REDIS_TLS === "true" ? {} : undefined,
//     };

// const redis =
//   typeof redisConfig === "string"
//     ? new RedisClient(redisConfig)
//     : new RedisClient(redisConfig);

// // Logging
// redis.on("connect", () => logger.info("🔌 Redis connected"));
// redis.on("error", (err) =>
//   logger.error("⚠️ Redis connection error:", err.message)
// );
// redis.on("end", () => logger.warn("⚠️ Redis connection closed"));
// redis.on("reconnecting", (delay: number) =>
//   logger.info(`🔌 Redis reconnecting in ${delay}ms...`)
// );
// redis.on("ready", () => logger.info("🔌 Redis client ready"));

// export default redis;

// // For BullMQ (it wants plain options, not an instance)
// export const redisOptions =
//   typeof redisConfig === "string" ? { url: redisConfig } : redisConfig;
