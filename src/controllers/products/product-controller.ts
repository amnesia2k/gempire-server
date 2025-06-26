import { Request, Response } from "express";
import { createProductWithImages } from "../../services/createProductWithImages";
import { db } from "../../db";
import { products } from "../../db/product-schema";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { productImages } from "../../db/product-images-schema";
import { category } from "../../db/category-schema";
import {
  AppError,
  throwBadRequest,
  throwNotFound,
  throwServerError,
} from "../../utils/error";
import { safeUploadToCloudinary } from "../../utils/safe-upload";
import { slugify } from "../../utils/slugify";
import { createId } from "@paralleldrive/cuid2";
import { safeDeleteFromCloudinary } from "../../utils/safe-delete";

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, description, price, unit, categoryId } = req.body;
    const files = req.files as Express.Multer.File[];

    if (
      !name ||
      !description ||
      !price ||
      !unit ||
      !categoryId ||
      !files?.length
    )
      throwBadRequest("All fields and at least one image are required.");

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

export const getAllProducts = async (_req: Request, res: Response) => {
  try {
    // 1. Fetch all products
    const allProducts = await db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt));

    if (allProducts.length === 0) throwNotFound("No products found");

    // 2. Fetch all images
    const productIds = allProducts.map((p) => p._id);
    const allImages = await db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds));

    const imagesByProductId: Record<string, typeof allImages> = {};
    allImages.forEach((img) => {
      if (!imagesByProductId[img.productId]) {
        imagesByProductId[img.productId] = [];
      }
      imagesByProductId[img.productId].push(img);
    });

    // 3. Fetch all categories (after filtering out nulls)
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

    // 4. Merge everything together
    const productsWithData = allProducts.map((product) => ({
      ...product,
      images: imagesByProductId[product._id] || [],
      category: product.categoryId
        ? categoryMap[product.categoryId] || null
        : null,
    }));

    res.status(200).json({
      message: "Products fetched successfully",
      success: true,
      data: productsWithData,
    });

    return;
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

export const getProductBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    if (!slug) throwBadRequest("Slug is required");

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

    res.status(200).json({
      success: true,
      message: "Product fetched",
      data: {
        ...product,
        images,
        category: categoryData || null,
      },
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
