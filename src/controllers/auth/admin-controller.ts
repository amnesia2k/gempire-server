import { Request, RequestHandler, Response } from "express";
import { db } from "../../db";
import { adminPasscodes } from "../../db/passcode-schema";
import { eq } from "drizzle-orm";
import { generateToken } from "../../helpers/generate-token";
import jwt from "jsonwebtoken";
import { AppError } from "../../utils/error";

type AccessRequestBody = { code: string };

export const accessDashboard = async (req: Request, res: Response) => {
  try {
    const { code } = req.body as AccessRequestBody;

    if (!code) {
      res.status(400).json({
        message: "Passcode is required",
      });
      return;
    }

    const passcodeResult = await db
      .select()
      .from(adminPasscodes)
      .where(eq(adminPasscodes.passcode, code));

    if (passcodeResult.length === 0) {
      res
        .status(401)
        .json({ success: false, valid: false, message: "Invalid passcode" });
      return;
    }

    const passcode = passcodeResult[0];
    const token = generateToken(passcode._id);

    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      secure: process.env.NODE_ENV === "production" ? true : false,
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

      res.status(500).json({
        message: "Something went wrong: " + message,
        success: false,
      });
    }
  }
};

export const logoutAdmin = async (req: Request, res: Response) => {
  try {
    res.clearCookie("token", {
      path: "/",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      secure: process.env.NODE_ENV === "production" ? true : false,
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

      res.status(500).json({
        message: "Something went wrong: " + message,
        success: false,
      });
    }
  }
};

export const getAdmin = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      res.status(401).json({ message: "No token provided", success: false });

      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (err) {
      res.status(401).json({ message: "Invalid token", success: false });
      return;
    }

    const adminId = (decoded as any)._id;

    const result = await db
      .select()
      .from(adminPasscodes)
      .where(eq(adminPasscodes._id, adminId));

    if (result.length === 0) {
      res.status(404).json({ message: "Admin not found", success: false });

      return;
    }

    res.status(200).json({
      message: "Fetched admin data successfully",
      data: result[0],
      success: true,
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
