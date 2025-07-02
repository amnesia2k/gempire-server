import express from "express";
import {
  accessDashboard,
  getAdmin,
  logoutAdmin,
} from "../controllers/admin-controller";
import { createRateLimiter } from "../utils/rate-limiter";

const router = express.Router();

const accessRateLimiter = createRateLimiter("access", 5);

router.post("/login", accessRateLimiter, accessDashboard);
router.post("/logout", logoutAdmin);
router.get("/admin", getAdmin);

export default router;
