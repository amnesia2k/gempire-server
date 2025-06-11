import { Request, Response } from "express";
import { createProductWithImages } from "../../services/createProductWithImages";

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
        success: false,
        message: "All fields and at least one image are required",
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
      success: true,
      message: "Product created successfully",
      data: result,
    });

    return;
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return;
  }
};
