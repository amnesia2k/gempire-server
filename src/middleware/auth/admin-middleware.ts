import { NextFunction, Request, Response } from "express";

export function tokenVerification(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies.token;

  if (!token) {
    res.status(401).json({
      error:
        "[Unauthorized] Admin token is required: Please log in to access this resource.",
      success: false,
    });

    return;
  }

  next();
}
