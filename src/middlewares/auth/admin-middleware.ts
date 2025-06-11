import { NextFunction, Request, Response } from "express";

export function adminToken(req: Request, res: Response, next: NextFunction) {
  const adminToken = req.cookies.adminToken;

  if (!adminToken) {
    res.status(401).json({
      error: "Unauthorized: Admin token is required",
    });

    return;
  }

  next();
}
