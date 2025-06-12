import { Request, Response } from "express";
import { createProductWithImages } from "../../services/createProductWithImages";
import { db } from "../../db";
import { products } from "../../db/product-schema";
import { desc, eq, inArray } from "drizzle-orm";
import { productImages } from "../../db/product-images-schema";
import { category } from "../../db/category-schema";

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, description, price, unit, categoryId } = req.body;
    const files = req.files as Express.Multer.File[];

    // Validate required fields
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

    res.status(201).json({
      message: "Product created successfully",
      success: true,
      data: result,
    });

    return;
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({
      message: "Internal server error",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return;
  }
};

export const getAllProducts = async (_req: Request, res: Response) => {
  try {
    // 1. Get all products
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

    // 2. Get all images for all product IDs
    const productIds = allProducts.map((p) => p._id);
    const allImages = await db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds));

    // 3. Group images by productId
    const imagesByProductId: Record<string, typeof allImages> = {};
    allImages.forEach((img) => {
      if (!imagesByProductId[img.productId]) {
        imagesByProductId[img.productId] = [];
      }
      imagesByProductId[img.productId].push(img);
    });

    // 4. Combine product with its images
    const productsWithImages = allProducts.map((product) => ({
      ...product,
      images: imagesByProductId[product._id] || [],
    }));

    res.status(200).json({
      message: "Products fetched successfully",
      success: true,
      data: productsWithImages,
    });
    return;
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      message: "Internal server error",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return;
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        message: "Product ID is required",
        success: false,
      });

      return;
    }

    // 1. Fetch product
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products._id, id))
      .limit(1);

    if (!product) {
      res.status(404).json({
        message: "Product not found",
        success: false,
      });

      return;
    }

    // 2. Fetch associated images
    const images = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, product._id));

    // 3. Fetch category info
    let cat = null;
    if (product.categoryId) {
      [cat] = await db
        .select({ name: category.name, slug: category.slug })
        .from(category)
        .where(eq(category._id, product.categoryId))
        .limit(1);
    }

    res.status(200).json({
      message: "Product fetched successfully",
      success: true,
      data: {
        ...product,
        images,
        category: cat || null, // in case category is missing somehow
      },
    });

    return;
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      message: "Internal server error",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return;
  }
};
