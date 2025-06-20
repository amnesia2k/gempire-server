import { Request, Response } from "express";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../../db";
import { category } from "../../db/category-schema";
import { slugify } from "../../utils/slugify";
import { eq } from "drizzle-orm";
import { AppError } from "../../utils/error";

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: "Name is required" });

      return;
    }

    const slug = slugify(name);

    // Check for duplicate slug
    const [existing] = await db
      .select()
      .from(category)
      .where(eq(category.slug, slug));

    if (existing) {
      res.status(409).json({
        success: false,
        message: `Category with slug "${slug}" already exists.`,
      });

      return;
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

      res.status(500).json({
        message: "Something went wrong: " + message,
        success: false,
      });
    }
  }
};

export const getAllCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await db.select().from(category);

    // const categories = await db
    //   .select({
    //     id: category._id,
    //     name: category.name,
    //     slug: category.slug,
    //   })
    //   .from(category);

    res.status(200).json({
      message: "Categories fetched successfully",
      success: true,
      data: categories,
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

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ success: false, message: "ID is required" });
      return;
    }

    // --- CHANGE STARTS HERE ---
    const categoryData = await db.query.category.findFirst({
      // Use findFirst instead of findMany
      where: eq(category._id, id),
      with: {
        products: {
          with: {
            images: true, // Eager load product images
          },
        },
      },
    });
    // --- CHANGE ENDS HERE ---

    if (!categoryData) {
      // This check will now work correctly for `undefined`
      res.status(404).json({
        message: "Category not found",
        success: false,
      });
      return;
    }

    res.status(200).json({
      message: "Category Products fetched successfully",
      success: true,
      data: categoryData,
    }); // Sends a single object
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
