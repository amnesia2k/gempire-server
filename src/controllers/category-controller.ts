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
import {
  invalidateAllCategoriesCache,
  invalidateCategoryCachesBySlug,
} from "../utils/cache-invalidation";

export const safeInvalidateCategory = async (
  categoryId: string | null | undefined
) => {
  if (!categoryId) return;

  const [cat] = await db
    .select({ slug: category.slug })
    .from(category)
    .where(eq(category._id, categoryId));

  if (cat?.slug) {
    await invalidateCategoryCachesBySlug(cat.slug);
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) throw throwBadRequest("Name is required");

    const slug = slugify(name);
    const [existing] = await db
      .select()
      .from(category)
      .where(eq(category.slug, slug));

    if (existing) {
      throw throwBadRequest(
        `Category "${name}" already exists. Try a different name.`
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

    await invalidateAllCategoriesCache(); // ❌ categories:all only

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
        error instanceof Error ? error.message : JSON.stringify(error);
      throwServerError("Something went wrong: " + message);
    }
  }
};

export const getAllCategories = async (_req: Request, res: Response) => {
  const cacheKey = "categories:all";

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.info("📦 Cache hit for categories:all");
      res.status(200).json(JSON.parse(cached));
      return;
    }

    const categoriesList = await db.select().from(category);
    if (!categoriesList.length) throwNotFound("No categories found");

    const responsePayload = {
      message: "Categories fetched successfully",
      success: true,
      data: categoriesList,
    };

    await redisClient.set(cacheKey, JSON.stringify(responsePayload), "EX", 600);

    res.status(200).json(responsePayload);
  } catch (error) {
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
    const cached = await redisClient.get(cacheKey);
    if (cached) res.status(200).json(JSON.parse(cached));
    return;

    let categoryData = null;
    let productList = [];
    let total = 0;

    if (slug === "all") {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(products);

      total = Number(count);
      productList = await db
        .select()
        .from(products)
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset);

      categoryData = { name: "All Products", slug: "all" };
    } else {
      const [cat] = await db
        .select({ _id: category._id, name: category.name, slug: category.slug })
        .from(category)
        .where(eq(category.slug, slug));

      if (!cat) throwNotFound("Category not found");
      categoryData = cat;

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(eq(products.categoryId, cat._id));

      total = Number(count);
      productList = await db
        .select()
        .from(products)
        .where(eq(products.categoryId, cat._id))
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset);
    }

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
      category: slug === "all" ? null : categoryData,
    }));

    const totalPages = Math.ceil(total / limit);

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
