// src/routes/promo.route.ts
import { Router } from "express";
import { editCodeDetails } from "../controllers/promotion-controller";
import { allCodeDetails } from "../controllers/promotion-controller";
import { createPromo } from "../controllers/promotion-controller";

const router = Router();

// POST /api/promo/create - Create a new promo code
router.post("/code", createPromo);

// GET /api/promo/all - Get all promo code details
router.get("/code", allCodeDetails);

// PUT /api/promo/edit/:_id - Edit existing promo code details
router.patch("/code/:id", editCodeDetails);

export default router;
