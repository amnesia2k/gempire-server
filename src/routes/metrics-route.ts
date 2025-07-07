import express from "express";
import { createRateLimiter } from "../utils/rate-limiter";
import { getMetrics } from "../controllers/metrics-controller";

const router = express.Router();

const metricsRateLimiter = createRateLimiter("orders", 15);

router.get("/metrics", metricsRateLimiter, getMetrics);

export default router;
