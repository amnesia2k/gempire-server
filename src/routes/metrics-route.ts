import express from "express";
import { createRateLimiter } from "../utils/rate-limiter";
import {
  getMetrics,
  getSalesByPeriod,
} from "../controllers/metrics-controller";

const router = express.Router();

router.get("/metrics", getMetrics);
router.get("/sales", getSalesByPeriod);

export default router;
