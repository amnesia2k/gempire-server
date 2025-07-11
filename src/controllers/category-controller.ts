import { Request, Response } from "express";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../db";
import { category } from "../db/category-schema";
import { slugify } from "../utils/slugify";
import { desc, eq, inArray, sql } from "drizzle-orm";
import {
  AppError,
  throwBadRequest,
  throwNotFound,
  throwServerError,
} from "../utils/error";
import redisClient from "../utils/redis";
import { products } from "../db/product-schema";
import { productImages } from "../db/product-images-schema";
import logger from "../utils/logger";

export const invalidateCategoryPages = async (slug: string) => {
  try {
    const keys = await redisClient.keys(`category:${slug}:page:*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      logger.info(`🧹 Invalidated ${keys.length} paginated caches for ${slug}`);
    }
  } catch (err) {
    logger.error("Cache invalidation failed:", err);
  }
};

export const safeInvalidateCategory = async (
  categoryId: string | null | undefined
) => {
  if (!categoryId) return;

  const [cat] = await db
    .select({ slug: category.slug })
    .from(category)
    .where(eq(category._id, categoryId));

  if (cat?.slug) {
    await invalidateCategoryPages(cat.slug);
    await redisClient.del(`category:${cat.slug}`);
    logger.info(`✅ Cache invalidated for category: ${cat.slug}`);
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) throw throwBadRequest("Name is required");

    const slug = slugify(name);

    // Check for duplicate slug
    const [existing] = await db
      .select()
      .from(category)
      .where(eq(category.slug, slug));

    if (existing) {
      throw throwBadRequest(
        `Category with name "${name}" already exists. Try a different name`
      );
    }

    const newCategory = {
      _id: createId(),
      name,
      slug,
    };

    const [inserted] = await db
      .insert(category)
      .values(newCategory)
      .returning();

    // After creating/updating a category, invalidate relevant caches
    // Invalidate the 'categories:all' cache to ensure fresh data on next request
    await redisClient.del("categories:all");
    // If you had a cache for specific categories, you'd invalidate that too, e.g.:
    // await redisClient.del(`category:${slug}`);

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: inserted,
    });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        message: error.message,
        success: false,
      });
    } else {
      logger.error("Unhandled error:", error);

      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null
          ? JSON.stringify(error)
          : "Unknown error";

      throwServerError("Something went wrong: " + message);
    }
  }
};

export const getAllCategories = async (_req: Request, res: Response) => {
  const cacheKey = "categories:all";

  try {
    // 1. Check Redis cache
    // The .get() and .set() methods work the same for ioredis as for node-redis
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.info("Cache hit for categories:", cached);
      res.status(200).json(JSON.parse(cached));
      return;
    }

    // 2. Cache miss → fetch from DB
    const categories = await db.select().from(category);
    if (categories.length === 0) throw throwNotFound("No categories found");

    const responsePayload = {
      message: "Categories fetched successfully",
      success: true,
      data: categories,
    };

    // 3. Store in Redis cache with TTL (600 seconds = 10 minutes)
    // For ioredis, use "EX" as a separate argument
    await redisClient.set(cacheKey, JSON.stringify(responsePayload), "EX", 600);

    res.status(200).json(responsePayload);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        message: error.message,
        success: false,
      });
    } else {
      logger.error("Unhandled error:", error);
      throwServerError("Something went wrong");
    }
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const page = Math.max(parseInt(req.query.page as string) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit as string) || 12, 100);
  const offset = (page - 1) * limit;

  if (!slug) return throwBadRequest("Category slug is required");

  const cacheKey = `category:${slug}:page:${page}:limit:${limit}`;

  try {
    // 1. Check Redis cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      res.status(200).json(JSON.parse(cached));
      return;
    }

    // 🛍️ Handle "All Products" pseudo-category
    if (slug === "all") {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(products);

      const total = Number(count);
      const totalPages = Math.ceil(total / limit);

      const productList = await db
        .select()
        .from(products)
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset);

      const productIds = productList.map((p) => p._id);
      const allImages = productIds.length
        ? await db
            .select()
            .from(productImages)
            .where(inArray(productImages.productId, productIds))
        : [];

      const productsWithImages = productList.map((product) => ({
        ...product,
        images: allImages.filter((img) => img.productId === product._id),
        category: null,
      }));

      const responsePayload = {
        message: "All products fetched successfully",
        success: true,
        data: {
          category: { name: "All Products", slug: "all" },
          products: productsWithImages,
        },
        total,
        page,
        limit,
        totalPages,
      };

      await redisClient.set(
        cacheKey,
        JSON.stringify(responsePayload),
        "EX",
        600
      );
      res.status(200).json(responsePayload);
      return;
    }

    // 2. Get category metadata
    const [categoryData] = await db
      .select({ _id: category._id, name: category.name, slug: category.slug })
      .from(category)
      .where(eq(category.slug, slug));

    if (!categoryData) throwNotFound("Category not found");

    const categoryId = categoryData._id;

    // 3. Get total product count in this category
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.categoryId, categoryId));

    const total = Number(count);
    const totalPages = Math.ceil(total / limit);

    // 4. Get paginated products
    const productList = await db
      .select()
      .from(products)
      .where(eq(products.categoryId, categoryId))
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    // 5. Attach images + category
    const productIds = productList.map((p) => p._id);
    const allImages = productIds.length
      ? await db
          .select()
          .from(productImages)
          .where(inArray(productImages.productId, productIds))
      : [];

    const productsWithImages = productList.map((product) => ({
      ...product,
      images: allImages.filter((img) => img.productId === product._id),
      category: categoryData,
    }));

    const responsePayload = {
      message: "Category products fetched successfully",
      success: true,
      data: {
        category: categoryData,
        products: productsWithImages,
      },
      total,
      page,
      limit,
      totalPages,
    };

    await redisClient.set(cacheKey, JSON.stringify(responsePayload), "EX", 600);
    res.status(200).json(responsePayload);
  } catch (error) {
    if (error instanceof AppError) {
      res
        .status(error.statusCode)
        .json({ message: error.message, success: false });
    } else {
      logger.error("Unhandled error:", error);
      throwServerError("Something went wrong");
    }
  }
};
