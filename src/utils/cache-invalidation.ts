import redisClient from "../utils/redis";
import logger from "../utils/logger";

// 🔥 Invalidate absolutely everything (dangerous in prod!)
export const invalidateAllCaches = async () => {
  try {
    const keys = await redisClient.keys("*");
    if (keys.length > 0) {
      await redisClient.del(...keys);
      logger.info(`🧹 Invalidated ${keys.length} total cache keys`);
    }
  } catch (err) {
    logger.error("Cache invalidation failed:", err);
  }
};

// 🎯 Specific domain-level invalidators
export const invalidateProductCaches = async () => {
  const keys = await redisClient.keys("product:*");
  if (keys.length > 0) {
    await redisClient.del(...keys);
    logger.info(`🧹 Invalidated ${keys.length} product caches`);
  }
};

export const invalidateOrderCaches = async () => {
  const keys = await redisClient.keys("order:*");
  if (keys.length > 0) {
    await redisClient.del(...keys);
    logger.info(`🧹 Invalidated ${keys.length} order caches`);
  }
};

export const invalidateAdminCaches = async () => {
  const keys = await redisClient.keys("admin:*");
  if (keys.length > 0) {
    await redisClient.del(...keys);
    logger.info(`🧹 Invalidated ${keys.length} admin caches`);
  }
};

// 🧹 CATEGORY-SPECIFIC INVALIDATION

// Invalidate just the top-level categories list
export const invalidateAllCategoriesCache = async () => {
  await redisClient.del("categories:all");
  logger.info("✅ Cache invalidated: categories:all");
};

// Invalidate paginated pages by slug
export const invalidateCategoryPages = async (slug: string) => {
  try {
    const keys = await redisClient.keys(`category:${slug}:page:*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      logger.info(
        `🧹 Invalidated ${keys.length} paginated category caches for "${slug}"`
      );
    }
  } catch (err) {
    logger.error("⚠️ Failed to invalidate paginated category pages:", err);
  }
};

// Invalidate full cache related to a single category slug
export const invalidateCategoryCachesBySlug = async (slug: string) => {
  await invalidateCategoryPages(slug);
  await redisClient.del(`category:${slug}`);
  logger.info(`✅ Cache invalidated for category: ${slug}`);
};

// Invalidate all category:* keys (wildcard wipe)
export const invalidateAllCategoryCaches = async () => {
  const keys = await redisClient.keys("category:*");
  if (keys.length > 0) {
    await redisClient.del(...keys);
    logger.info(`🧹 Invalidated ${keys.length} category caches`);
  }
};
