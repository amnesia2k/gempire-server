// src/routes/promo.route.ts
import { Router } from "express";
import {
  editCodeDetails,
  getPromoCodeByCode,
  getSinglePromo,
} from "../controllers/promotion-controller";
import { allCodeDetails } from "../controllers/promotion-controller";
import { createPromo } from "../controllers/promotion-controller";

const router = Router();

router.post("/", createPromo);
router.get("/all", allCodeDetails);
router.get("/:id", getSinglePromo);
router.get("/code/:code", getPromoCodeByCode);
router.patch("/:id", editCodeDetails);

export default router;
