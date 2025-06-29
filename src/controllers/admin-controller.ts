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

type AccessRequestBody = { code: string };

export const accessDashboard = async (req: Request, res: Response) => {
  try {
    const { code } = req.body as AccessRequestBody;

    if (!code) throwBadRequest("Passcode is required");

    const passcodeResult = await db
      .select()
      .from(adminPasscodes)
      .where(eq(adminPasscodes.passcode, code));

    if (passcodeResult.length === 0) throwBadRequest("Invalid passcode");

    const passcode = passcodeResult[0];
    const token = generateToken(passcode._id);

    res.setHeader("Cache-Control", "no-store"); // 👈 SOLUTION ✅

    res.cookie("token", token, {
      httpOnly: false, // OR true (if you’re using server-only reads)
      path: "/",
      sameSite: "none", // must be "none" for cross-site
      secure: true, // must be true for SameSite=None to work
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

export const logoutAdmin = async (req: Request, res: Response) => {
  try {
    res.setHeader("Cache-Control", "no-store"); // 👈 SOLUTION ✅

    res.clearCookie("token", {
      path: "/",
      sameSite: "none",
      secure: true,
    });

    res.status(200).json({ message: "Logout successful", success: true });
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

export const getAdmin = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token;

    if (!token) throwUnauthorized("Admin token is required");

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { _id: string };
    } catch {
      throwUnauthorized("Invalid admin token");

      return;
    }

    const adminId = decoded._id;

    const result = await db
      .select()
      .from(adminPasscodes)
      .where(eq(adminPasscodes._id, adminId));

    if (result.length === 0) throwNotFound("Admin not found");

    res.status(200).json({
      message: "Fetched admin data successfully",
      data: result[0],
      success: true,
    });
  } catch (error) {
    console.error("getAdmin error:", error);
    throwServerError("Something went wrong");
  }
};
