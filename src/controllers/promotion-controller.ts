import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../db";
import { promoCodes } from "../db/promo-schema";
import {
  throwBadRequest,
  throwNotFound,
  throwServerError,
} from "../utils/error";
import redisClient from "../utils/redis";

const PROMO_CACHE_KEY = "promo:all";
const CACHE_TTL = 600; // 10 minutes in seconds

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
      return res.status(409).json({
        success: false,
        message: "Promo code already exists.",
      });
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

    // 🔥 Invalidate cached promos
    await redisClient.del(PROMO_CACHE_KEY);

    return res.status(201).json({
      success: true,
      message: "Promo code created successfully!",
      promoCode: result[0],
    });
  } catch (error: any) {
    console.error("Error creating promo code:", error);
    throwServerError("Internal server error.");
  }
};

export const allCodeDetails = async (_req: Request, res: Response) => {
  try {
    // 🚀 Try to get from Redis first
    const cached = await redisClient.get(PROMO_CACHE_KEY);

    if (cached) {
      return res.status(200).json({
        success: true,
        message: "Promo codes retrieved from cache.",
        promoCodes: JSON.parse(cached),
      });
    }

    // 🔥 Cache miss, fetch from DB
    const promos = await db.select().from(promoCodes);

    if (promos.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No promo codes found.",
        promoCodes: [],
      });
    }

    // Cache result for 10 mins
    await redisClient.set(
      PROMO_CACHE_KEY,
      JSON.stringify(promos),
      "EX",
      CACHE_TTL
    );

    return res.status(200).json({
      success: true,
      message: "Promo codes retrieved successfully.",
      promoCodes: promos,
    });
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

    // 🚨 Check for code collision
    if (updateData.code) {
      const existing = await db
        .select()
        .from(promoCodes)
        .where(eq(promoCodes.code, updateData.code))
        .limit(1);

      if (existing.length > 0 && existing[0]._id !== id) {
        return res.status(409).json({
          success: false,
          message: "Another promo code with this code already exists.",
        });
      }
    }

    const result = await db
      .update(promoCodes)
      .set(updateData)
      .where(eq(promoCodes._id, id))
      .returning();

    if (result.length === 0) throwNotFound("Promo code not found.");

    // 🚀 Invalidate cache after update
    await redisClient.del(PROMO_CACHE_KEY);

    return res.status(200).json({
      success: true,
      message: "Promo code updated successfully!",
      promoCode: result[0],
    });
  } catch (error: any) {
    console.error("Error updating promo code:", error);
    throwServerError("Internal server error.");
  }
};
