import { Request, Response } from "express";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../../db";
import { category } from "../../db/category-schema";
import { slugify } from "../../utils/slugify";
import { eq } from "drizzle-orm";

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
  } catch (err) {
    console.error("Error creating category:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await db
      .select({
        id: category._id,
        name: category.name,
        slug: category.slug,
      })
      .from(category);

    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching categories" });
  }
};
