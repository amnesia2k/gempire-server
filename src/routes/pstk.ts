import express, { Request, Response } from "express";
import axios from "axios";

const PAYSTACK_SECRET_KEY = process.env.PSTK_SECRET_KEY || "";

const router = express.Router();

router.get("/paystack/banks", async (_req: Request, res: Response) => {
  try {
    const response = await axios.get("https://api.paystack.co/bank", {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
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

router.post("/create/subaccount", async (_req: Request, res: Response) => {
  try {
    console.log("🚨 Paystack Key:", PAYSTACK_SECRET_KEY);
    const response = await axios.post(
      "https://api.paystack.co/subaccount",
      {
        business_name: "Gempire",
        account_number: "9163451913",
        bank_code: "999992", // OPay's code
        percentage_charge: 0, // Send all funds
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(201).json({
      message: "Subaccount created",
      subaccount: response.data.data, // Save this!
    });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "response" in err &&
      err.response &&
      typeof err.response === "object" &&
      "data" in err.response
    ) {
      // @ts-ignore
      console.error(err.response.data);
    } else if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error("Unknown error", err);
    }
    res.status(500).json({ error: "Failed to create subaccount" });
  }
});

export default router;
