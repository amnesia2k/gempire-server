import { Request, Response } from "express";
import { createProductWithImages } from "../services/createProductWithImages";
import { db } from "../db";
import { products } from "../db/product-schema";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { productImages } from "../db/product-images-schema";
import { category } from "../db/category-schema";
import {
  AppError,
  throwBadRequest,
  throwNotFound,
  throwServerError,
} from "../utils/error";
import { safeUploadToCloudinary } from "../utils/safe-upload";
import { slugify } from "../utils/slugify";
import { createId } from "@paralleldrive/cuid2";
import { safeDeleteFromCloudinary } from "../utils/safe-delete";
import redisClient from "../utils/redis";
import { safeInvalidateCategory } from "./category-controller";
import logger from "../utils/logger";

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, description, price, unit, categoryId } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!name || !description || !price || !unit || !categoryId)
      throwBadRequest("All fields are required.");

    if (!files?.length) throwBadRequest("At least one image is required.");

    const result = await createProductWithImages({
      name,
      description,
      price: parseFloat(price),
      unit: parseInt(unit),
      categoryId,
      files,
    });

    // Fetch category details
    let cat = null;
    if (result.product.categoryId) {
      [cat] = await db
        .select({ name: category.name, slug: category.slug })
        .from(category)
        .where(eq(category._id, result.product.categoryId))
        .limit(1);
    }

    // --- CACHE INVALIDATION ---
    // Invalidate general caches
    await redisClient.del("products:all");
    await redisClient.del(`product:${result.product.slug}`);
    await redisClient.del("categories:all");

    // Invalidate category-specific caches
    if (result.product.categoryId) {
      await safeInvalidateCategory(result.product.categoryId);
    }

    // --- END CACHE INVALIDATION ---

    res.status(201).json({
      message: "Product created successfully",
      success: true,
      data: {
        ...result,
        category: cat || null,
        slug: result.product.slug,
      },
    });

    return;
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

export const getAllProducts = async (_req: Request, res: Response) => {
  const cacheKey = "products:all";

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      res.status(200).json(JSON.parse(cached));
      logger.info("Cache hit for products:", cached);

      return;
    }

    const allProducts = await db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt));

    if (allProducts.length === 0) {
      res.status(200).json({
        message: "No products found",
        success: true,
        data: [],
      });

      return;
    }

    const productIds = allProducts.map((p) => p._id);
    const allImages = await db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds));

    const categoryIds = [
      ...new Set(allProducts.map((p) => p.categoryId).filter(Boolean)),
    ] as string[];
    const allCategories = categoryIds.length
      ? await db
          .select({
            _id: category._id,
            name: category.name,
            slug: category.slug,
          })
          .from(category)
          .where(inArray(category._id, categoryIds))
      : [];

    const categoryMap = Object.fromEntries(
      allCategories.map((cat) => [cat._id, cat])
    );

    const productsWithData = allProducts.map((product) => ({
      ...product,
      images: allImages.filter((img) => img.productId === product._id),
      category: product.categoryId
        ? categoryMap[product.categoryId] || null
        : null,
    }));

    const responsePayload = {
      message: "Products fetched successfully",
      success: true,
      data: productsWithData,
    };

    // Store in Redis cache with TTL (600 seconds = 10 minutes)
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

export const getProductBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  if (!slug) return throwBadRequest("Slug is required");

  const cacheKey = `product:${slug}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      res.status(200).json(JSON.parse(cached));
      return;
    }

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);
    if (!product) throwNotFound("Product not found");

    const images = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, product._id));
    let categoryData = null;
    if (product.categoryId) {
      [categoryData] = await db
        .select({ name: category.name, slug: category.slug })
        .from(category)
        .where(eq(category._id, product.categoryId));
    }

    const responsePayload = {
      success: true,
      message: "Product fetched",
      data: { ...product, images, category: categoryData || null },
    };

    await redisClient.set(cacheKey, JSON.stringify(responsePayload), "EX", 600);

    res.status(200).json(responsePayload);
  } catch (error: unknown) {
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

export const editProduct = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { name, description, price, unit, categoryId } = req.body;

    const rawDeletedImageIds = req.body.deletedImageIds;
    const deletedImageIds = Array.isArray(rawDeletedImageIds)
      ? rawDeletedImageIds
      : rawDeletedImageIds
      ? [rawDeletedImageIds]
      : [];

    const files = req.files as Express.Multer.File[];

    if (!slug) throwBadRequest("Product slug is required");

    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.slug, slug));

    if (!existingProduct) throwNotFound("Product not found");

    const productId = existingProduct._id;

    let newSlug = existingProduct.slug;
    if (name && name !== existingProduct.name) {
      newSlug = slugify(name);
      const [conflict] = await db
        .select()
        .from(products)
        .where(and(eq(products.slug, newSlug), ne(products._id, productId)));

      if (conflict) {
        throw throwBadRequest(
          `Another product already exists with name "${name}"`
        );
      }
    }

    // 🗑 Delete selected images from Cloudinary + DB
    if (deletedImageIds.length > 0) {
      const imagesToDelete = await db
        .select()
        .from(productImages)
        .where(
          and(
            eq(productImages.productId, productId),
            inArray(productImages._id, deletedImageIds)
          )
        );

      await Promise.all(
        imagesToDelete.map((img) => safeDeleteFromCloudinary(img.publicId))
      );

      await db
        .delete(productImages)
        .where(
          and(
            eq(productImages.productId, productId),
            inArray(productImages._id, deletedImageIds)
          )
        );
    }

    // ☁️ Upload new images
    const uploadedImageRows = [];
    if (files && files.length > 0) {
      const uploads = await Promise.all(
        files.map((file) => safeUploadToCloudinary(file))
      );

      const inserted = await db
        .insert(productImages)
        .values(
          uploads.map(({ url, publicId }) => ({
            _id: createId(),
            productId,
            imageUrl: url,
            publicId,
          }))
        )
        .returning();

      uploadedImageRows.push(...inserted);
    }

    const [updatedProduct] = await db
      .update(products)
      .set({
        ...(name && { name }),
        ...(description && { description }),
        ...(price && { price: Number(price) }),
        ...(unit && { unit: Number(unit) }),
        ...(categoryId && { categoryId }),
        ...(name && { slug: newSlug }),
        updatedAt: new Date(),
      })
      .where(eq(products._id, productId))
      .returning();

    // --- CACHE INVALIDATION ---
    await redisClient.del("products:all");
    await redisClient.del(`product:${slug}`);
    if (newSlug !== slug) {
      await redisClient.del(`product:${newSlug}`);
    }

    await redisClient.del("categories:all");

    // If category changed, invalidate both old and new
    if (categoryId && categoryId !== existingProduct.categoryId) {
      if (existingProduct.categoryId) {
        await safeInvalidateCategory(existingProduct.categoryId);
      }
      await safeInvalidateCategory(categoryId);
    } else if (existingProduct.categoryId) {
      await safeInvalidateCategory(existingProduct.categoryId);
    }

    // --- END CACHE INVALIDATION ---

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: {
        product: updatedProduct,
        newImages: uploadedImageRows,
        slug: updatedProduct.slug,
      },
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

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) throwBadRequest("Product ID is required");

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products._id, id));

    if (!product) throwNotFound("Product not found");

    const imageRecords = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id));

    await Promise.all(
      imageRecords.map((img) => safeDeleteFromCloudinary(img.publicId))
    );

    await db.delete(productImages).where(eq(productImages.productId, id));
    await db.delete(products).where(eq(products._id, id));

    // --- CACHE INVALIDATION ---
    await redisClient.del("products:all");
    await redisClient.del(`product:${product.slug}`);
    await redisClient.del("categories:all");

    if (product.categoryId) {
      await safeInvalidateCategory(product.categoryId);
    }

    // --- END CACHE INVALIDATION ---

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
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
