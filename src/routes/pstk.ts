import express, { Request, Response } from "express";
import axios from "axios";

const router = express.Router();

router.get("/paystack/banks", async (_req: Request, res: Response) => {
  try {
    const response = await axios.get("https://api.paystack.co/bank", {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
      params: {
        currency: "NGN",
        type: "nuban", // optional: ensures you get NUBAN account types
      },
    });

    res.status(200).json(response.data); // full payload with data & meta
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "💥 Paystack error:",
        error.response?.data || error.message
      );
    } else {
      console.error("💥 Paystack error:", (error as Error).message);
    }
    res.status(500).json({ error: "Failed to fetch banks from Paystack" });
  }
});

export default router;
