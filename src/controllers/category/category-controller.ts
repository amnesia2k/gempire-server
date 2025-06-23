import { Request, Response } from "express";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../../db";
import { category } from "../../db/category-schema";
import { slugify } from "../../utils/slugify";
import { eq } from "drizzle-orm";
import {
  AppError,
  throwBadRequest,
  throwNotFound,
  throwServerError,
} from "../../utils/error";

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
  try {
    const categories = await db.select().from(category);

    if (categories.length === 0) throw throwNotFound("No categories found");

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

      throwServerError("Something went wrong: " + message);
    }
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) throwBadRequest("Category id is required");

    const categoryData = await db.query.category.findFirst({
      where: eq(category._id, id),
      with: {
        products: {
          with: {
            images: true,
          },
        },
      },
    });

    if (!categoryData) throwNotFound("Category not found");

    res.status(200).json({
      message: "Category Products fetched successfully",
      success: true,
      data: categoryData,
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
