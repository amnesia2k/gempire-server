import { Request, RequestHandler, Response } from "express";
import { db } from "../../db";
import { adminPasscodes } from "../../db/passcode-schema";
import { eq } from "drizzle-orm";
import { generateToken } from "../../helpers/generate-token";

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
  } catch (error) {
    console.error("Error accessing admin dashboard:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return;
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
  } catch (error) {
    console.error("Error logging out admin:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
