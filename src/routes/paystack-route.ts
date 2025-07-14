import express, { Request, Response } from "express";
import {
  getPaystackBanks,
  createSubaccount,
  initializePayment,
  verifyTransaction,
} from "../controllers/paystack-controller";

const router = express.Router();

router.get("/paystack/banks", getPaystackBanks);
router.post("/create/subaccount", createSubaccount);
router.post("/payment", initializePayment);
router.get("/verify/:reference", verifyTransaction);
router.get("/test", (_req: Request, res: Response) => {
  res.status(200).json({ message: "Paystack route is working" });
});

export default router;
