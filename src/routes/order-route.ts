import express from "express";
import {
  createOrder,
  getOrderById,
  getOrders,
  updateOrderStatus,
} from "../controllers/order-controller";
import multer from "multer";

const upload = multer();

const router = express.Router();

router.post("/order", upload.none(), createOrder);
router.get("/orders", getOrders);
router.get("/order/:id", getOrderById);
router.patch("/order/:id/status", updateOrderStatus);

export default router;
