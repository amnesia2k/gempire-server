import { Request, Response } from "express";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../db";
import { category } from "../db/category-schema";
import { slugify } from "../utils/slugify";
import { eq } from "drizzle-orm";
import {
  AppError,
  throwBadRequest,
  throwNotFound,
  throwServerError,
} from "../utils/error";
import redisClient from "../utils/redis";

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
      console.error("Unhandled error:", error);

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
      console.log("Cache hit for categories:", cached);
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
      console.error("Unhandled error:", error);
      throwServerError("Something went wrong");
    }
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  const { slug } = req.params;
  if (!slug) return throwBadRequest("Category id is required");

  const cacheKey = `category:${slug}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      res.status(200).json(JSON.parse(cached));
      return;
    }

    const categoryData = await db.query.category.findFirst({
      where: eq(category.slug, slug),
      with: { products: { with: { images: true } } },
    });

    if (!categoryData) throwNotFound("Category not found");

    const responsePayload = {
      message: "Category Products fetched successfully",
      success: true,
      data: categoryData,
    };

    await redisClient.set(cacheKey, JSON.stringify(responsePayload), "EX", 600);

    res.status(200).json(responsePayload);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        message: error.message,
        success: false,
      });
    } else {
      console.error("Unhandled error:", error);
      throwServerError("Something went wrong");
    }
  }
};
