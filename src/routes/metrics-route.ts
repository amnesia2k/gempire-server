import express from "express";
import { createRateLimiter } from "../utils/rate-limiter";
import {
  getMetrics,
  getSalesByPeriod,
} from "../controllers/metrics-controller";

const router = express.Router();

const metricsRateLimiter = createRateLimiter("orders", 15);

router.get("/metrics", metricsRateLimiter, getMetrics);
router.get("/sales", metricsRateLimiter, getSalesByPeriod);

export default router;
