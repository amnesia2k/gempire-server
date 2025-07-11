import { Request, RequestHandler, Response } from "express";
import { db } from "../db";
import { adminPasscodes } from "../db/passcode-schema";
import { eq } from "drizzle-orm";
import { generateToken } from "../helpers/generate-token";
import jwt from "jsonwebtoken";
import {
  AppError,
  throwBadRequest,
  throwNotFound,
  throwServerError,
  throwUnauthorized,
} from "../utils/error";
import redisClient from "../utils/redis";
import logger from "../utils/logger";

type AccessRequestBody = { code: string };

export const accessDashboard = async (req: Request, res: Response) => {
  try {
    const { code } = req.body as AccessRequestBody;

    if (!code) throwBadRequest("Passcode is required");

    const [passcode] = await db
      .select()
      .from(adminPasscodes)
      .where(eq(adminPasscodes.passcode, code));

    if (!passcode) throwBadRequest("Invalid passcode");

    const token = generateToken(passcode._id);

    // Invalidate admin cache after login (optional, useful if admin data changed)
    await redisClient.del(`admin:${passcode._id}`);

    res.setHeader("Cache-Control", "no-store");

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      valid: true,
      message: "Access granted",
      data: { ...passcode, token },
    });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    } else {
      logger.error("Unhandled error:", error);
      throwServerError("Something went wrong.");
    }
  }
};

export const logoutAdmin = async (_req: Request, res: Response) => {
  try {
    const token = _req.cookies.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        _id: string;
      };
      await redisClient.del(`admin:${decoded._id}`);
    }

    res.setHeader("Cache-Control", "no-store");

    res.clearCookie("token", {
      path: "/",
      sameSite: "none",
      secure: true,
    });

    res.status(200).json({ message: "Logout successful", success: true });
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

export const getAdmin = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token;
    if (!token) throwUnauthorized("Admin token is required");

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      _id: string;
    };
    const adminId = decoded._id;

    const cacheKey = `admin:${adminId}`;

    // 1. Try cache
    const cachedAdmin = await redisClient.get(cacheKey);
    if (cachedAdmin) {
      logger.info("Cache hit for admin:", adminId);
      res.status(200).json({
        message: "Fetched admin data successfully (from cache)",
        data: JSON.parse(cachedAdmin),
        success: true,
      });

      return;
    }

    // 2. Cache miss - fetch from DB
    const [admin] = await db
      .select()
      .from(adminPasscodes)
      .where(eq(adminPasscodes._id, adminId));

    if (!admin) throwNotFound("Admin not found");

    // 3. Cache the result for 1 hour (3600 seconds)
    await redisClient.set(cacheKey, JSON.stringify(admin), "EX", 3600);

    res.status(200).json({
      message: "Fetched admin data successfully",
      data: admin,
      success: true,
    });
  } catch (error) {
    logger.error("getAdmin error:", error);
    throwServerError("Something went wrong");
  }
};
