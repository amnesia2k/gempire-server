import RedisClient from "ioredis";
import { logger } from "./logger";
import { env } from "./env";

const redis = env.REDIS_URL
  ? new RedisClient(env.REDIS_URL)
  : new RedisClient({
      host: env.REDIS_HOST || "127.0.0.1",
      port: Number(env.REDIS_PORT ?? 6379),
      password: env.REDIS_PASSWORD || undefined,
      tls: env.REDIS_TLS === "true" ? {} : undefined,
    });

redis.on("connect", () => logger.info("🔌 Redis connected"));
redis.on("error", (err) =>
  logger.error("⚠️ Redis connection error:", err.message)
);
redis.on("end", () => logger.warn("⚠️ Redis connection closed"));
redis.on("reconnecting", (delay: number) =>
  logger.info(`🔌 Redis reconnecting in ${delay}ms...`)
);
redis.on("ready", () => logger.info("🔌 Redis client ready"));

export default redis;
