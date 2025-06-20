import { Request, Response } from "express";
import { createProductWithImages } from "../../services/createProductWithImages";
import { db } from "../../db";
import { products } from "../../db/product-schema";
import { desc, eq, inArray } from "drizzle-orm";
import { productImages } from "../../db/product-images-schema";
import { category } from "../../db/category-schema";
import { AppError } from "../../utils/error";

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
    ) {
      res.status(400).json({
        message: "All fields and at least one image are required",
        success: false,
      });

      return;
    }

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

      res.status(500).json({
        message: "Something went wrong: " + message,
        success: false,
      });
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

    if (allProducts.length === 0) {
      res.status(404).json({
        message: "No products found",
        success: false,
      });

      return;
    }

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

      res.status(500).json({
        message: "Something went wrong: " + message,
        success: false,
      });
    }
  }
};

export const getProductBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      res.status(400).json({ message: "Slug is required", success: false });
      return;
    }

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (!product) {
      res.status(404).json({ message: "Product not found", success: false });
      return;
    }

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

      res.status(500).json({
        message: "Something went wrong: " + message,
        success: false,
      });
    }
  }
};
