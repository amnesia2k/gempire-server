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

router.post("/code", createPromo);
router.get("/code", allCodeDetails);
router.get("/code/:id", getSinglePromo);
router.get("/code/string/:code", getPromoCodeByCode);
router.patch("/code/:id", editCodeDetails);

export default router;
