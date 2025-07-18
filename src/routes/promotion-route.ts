// src/routes/promo.route.ts
import { Router } from "express";
import {
  editCodeDetails,
  getSinglePromo,
} from "../controllers/promotion-controller";
import { allCodeDetails } from "../controllers/promotion-controller";
import { createPromo } from "../controllers/promotion-controller";

const router = Router();

router.post("/code", createPromo);
router.get("/code", allCodeDetails);
router.get("/code/:id", getSinglePromo);
router.patch("/code/:id", editCodeDetails);

export default router;
