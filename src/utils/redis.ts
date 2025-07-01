import RedisClient from "ioredis";

const redis = process.env.REDIS_URL
  ? new RedisClient(process.env.REDIS_URL)
  : new RedisClient({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      tls: process.env.REDIS_TLS === "true" ? {} : undefined,
    });

redis.on("connect", () => console.log("🔌 Redis connected"));
redis.on("error", (err) =>
  console.error("⚠️ Redis connection error:", err.message)
);
redis.on("end", () => console.warn("⚠️ Redis connection closed"));
redis.on("reconnecting", (delay: number) =>
  console.log(`🔌 Redis reconnecting in ${delay}ms...`)
);
redis.on("ready", () => console.log("🔌 Redis client ready"));

export default redis;
