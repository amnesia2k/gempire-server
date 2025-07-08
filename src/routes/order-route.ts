import express from "express";
import {
  createOrder,
  getOrderById,
  getOrders,
  updateOrderStatus,
} from "../controllers/order-controller";
import multer from "multer";
import { createRateLimiter } from "../utils/rate-limiter";

const upload = multer();

const router = express.Router();

const orderRateLimiter = createRateLimiter("order", 5);

router.post("/order", orderRateLimiter, upload.none(), createOrder);
router.get("/orders", getOrders);
router.get("/order/:id", getOrderById);
router.patch("/order/:id/status", orderRateLimiter, updateOrderStatus);

export default router;
