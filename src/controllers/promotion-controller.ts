import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../db";
import { promoCodes } from "../db/promo-schema";
import {
  AppError,
  throwBadRequest,
  throwForbidden,
  throwNotFound,
  throwServerError,
} from "../utils/error";
import redis from "../utils/redis";

export const createPromo = async (req: Request, res: Response) => {
  try {
    const {
      name,
      code,
      discount,
      isPercentage,
      description,
      ctaText,
      subtitle,
      urgent,
    } = req.body;

    if (
      !name ||
      !code ||
      discount === undefined ||
      !description ||
      !ctaText ||
      !subtitle
    ) {
      throwBadRequest("Missing required fields.");
    }

    const numericDiscount = parseFloat(discount);
    if (isNaN(numericDiscount)) {
      throwBadRequest("Invalid discount value. Must be a number.");
    }

    const existingCode = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.code, code.toUpperCase()))
      .limit(1);

    if (existingCode.length > 0) {
      res.status(409).json({
        success: false,
        message: "Promo code already exists.",
      });

      return;
    }

    const newPromo = {
      _id: createId(),
      name,
      code: code.toUpperCase(),
      discount: String(numericDiscount),
      isPercentage: typeof isPercentage === "boolean" ? isPercentage : true,
      isActive: true,
      description,
      ctaText,
      subtitle,
      urgent: typeof urgent === "boolean" ? urgent : false,
    };

    const result = await db.insert(promoCodes).values(newPromo).returning();

    // Invalidate cached promos
    await redis.del("promo:all");

    res.status(201).json({
      success: true,
      message: "Promo code created successfully!",
      promoCode: result[0],
    });

    return;
  } catch (error: any) {
    console.error("Error creating promo code:", error);
    throwServerError("Internal server error.");
  }
};

export const allCodeDetails = async (_req: Request, res: Response) => {
  try {
    // Try to get from Redis first
    const cached = await redis.get("promo:all");

    if (cached) {
      res.status(200).json({
        success: true,
        message: "Promo codes retrieved from cache.",
        data: JSON.parse(cached),
      });

      return;
    }

    // Cache miss, fetch from DB
    const promos = await db.select().from(promoCodes);

    if (promos.length === 0) {
      throwNotFound("No promo codes found.");
    }

    // Cache result for 10 mins
    await redis.set("promo:all", JSON.stringify(promos), { EX: 600 });

    res.status(200).json({
      success: true,
      message: "Promo codes retrieved successfully.",
      data: promos,
    });

    return;
  } catch (error: any) {
    console.error("Error fetching all promo codes:", error);
    throwServerError("Internal server error.");
  }
};

export const editCodeDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      discount,
      isPercentage,
      isActive,
      description,
      ctaText,
      subtitle,
      urgent,
    } = req.body;

    if (!id) throwBadRequest("Promo code ID is required.");

    const updateData: Record<string, any> = {};

    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (discount !== undefined) {
      const numericDiscount = parseFloat(discount);
      if (isNaN(numericDiscount)) {
        throwBadRequest("Invalid discount value.");
      }
      updateData.discount = String(numericDiscount);
    }
    if (isPercentage !== undefined) updateData.isPercentage = isPercentage;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (description !== undefined) updateData.description = description;
    if (ctaText !== undefined) updateData.ctaText = ctaText;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (urgent !== undefined) updateData.urgent = urgent;

    if (Object.keys(updateData).length === 0) {
      throwBadRequest("No fields provided to update.");
    }

    // Check for code collision
    if (updateData.code) {
      const existing = await db
        .select()
        .from(promoCodes)
        .where(eq(promoCodes.code, updateData.code))
        .limit(1);

      if (existing.length > 0 && existing[0]._id !== id) {
        res.status(409).json({
          success: false,
          message: "Another promo code with this code already exists.",
        });

        return;
      }
    }

    const result = await db
      .update(promoCodes)
      .set(updateData)
      .where(eq(promoCodes._id, id))
      .returning();

    if (result.length === 0) throwNotFound("Promo code not found.");

    // Invalidate cache after update
    await redis.del("promo:all");

    res.status(200).json({
      success: true,
      message: "Promo code updated successfully!",
      promoCode: result[0],
    });

    return;
  } catch (error: any) {
    console.error("Error updating promo code:", error);
    throwServerError("Internal server error.");
  }
};

export const getSinglePromo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) throwBadRequest("Promo code ID is required.");

    const cacheKey = `promo:${id}`;

    // 1️⃣ Try to get from Redis first
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        message: "Promo code retrieved from cache.",
        promoCode: JSON.parse(cached),
      });

      return;
    }

    // 2️⃣ Not in cache → fetch from DB
    const result = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes._id, id))
      .limit(1);

    if (result.length === 0) throwNotFound("Promo code not found.");

    const promo = result[0];

    // 3️⃣ Cache it
    await redis.set(cacheKey, JSON.stringify(promo), { EX: 600 });

    res.status(200).json({
      success: true,
      message: "Promo code retrieved from database.",
      promoCode: promo,
    });

    return;
  } catch (error: any) {
    console.error("Error fetching single promo code:", error);
    throwServerError("Internal server error.");
  }
};

// New controller to get promo code by its 'code' string
export const getPromoCodeByCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params; // Expect the code in params, e.g., /api/promo/code/YOURCODE

    if (!code) throwBadRequest("Promo code string is required.");

    const cacheKey = `promo:code:${code.toUpperCase()}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        message: "Promo code retrieved from cache by code.",
        promoCode: JSON.parse(cached),
      });
      return;
    }

    const [promo] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.code, code.toUpperCase()))
      .limit(1);

    if (!promo) throwForbidden("Invalid Promo code.");
    if (!promo.isActive) throwBadRequest("Promo code is not active.");

    await redis.set(cacheKey, JSON.stringify(promo), { EX: 600 }); // Cache for 10 minutes

    res.status(200).json({
      success: true,
      message: "Promo code retrieved by code from database.",
      promoCode: promo,
    });
  } catch (error: any) {
    console.error("Error fetching promo code by code:", error);

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: error.success,
        message: error.message,
      });
    }

    // fallback for truly unknown errors
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
