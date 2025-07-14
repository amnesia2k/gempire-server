import { Request, Response } from "express";
import axios from "axios";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../db";
import { orderItems, orders } from "../db/order-schema";
import { eq } from "drizzle-orm";

const PAYSTACK_SECRET_KEY = process.env.PSTK_SECRET_KEY || "";

// Paystack fees constants
// const FIXED_FEE = 100; // ₦100 fixed fee
// const PERCENTAGE_FEE = 0.015; // 1.5%

// 🏦 Get Bank List

// 💰 Initialize Payment
export const initializePayment = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      res.status(400).json({ error: "orderId is required" });

      return;
    }

    // 🧾 Fetch order by orderId (public-facing ID)
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderId, orderId));

    if (!order) {
      res.status(404).json({ error: "Order not found" });

      return;
    }

    // 🧮 Get all items for the order (to calculate total)
    const items = await db
      .select({
        unitPrice: orderItems.unitPrice,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order._id));

    if (!items || items.length === 0) {
      res.status(400).json({ error: "No items found for this order" });

      return;
    }

    // 💵 Calculate total amount in Kobo (₦x * 100)
    const totalAmount = items.reduce((sum, item) => {
      return sum + Number(item.unitPrice) * item.quantity;
    }, 0);

    const amountInKobo = totalAmount * 100;
    const reference = `tx_${createId()}`;

    const payload = {
      reference,
      email: order.email,
      amount: amountInKobo,
      subaccount: "ACCT_i3dzr4mhkxizgo4", // 👈 Replace with dynamic subaccount if needed ACCT_40m22ih8x2mb2b0 - this is test
      transaction_charge: 100, // 👈 Fixed fee for buyer
      bearer: "subaccount", // 👈 Buyer pays fees, seller receives full amount
      callback_url: `http://localhost:3000/success?order-id=${order.orderId}&tx-ref=${reference}`,
      // 👈 Adjust for prod
      metadata: {
        orderId: order.orderId,
        name: order.name,
        email: order.email,
      },
    };

    const headers = {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    };

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      payload,
      { headers }
    );

    res.status(200).json({
      success: true,
      message: "Authorization URL created",
      data: response.data.data,
    });

    return;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "💥 Paystack error:",
        error.response?.data || error.message
      );
      res.status(500).json({
        error: error.response?.data || "Paystack initialization failed",
      });

      return;
    }

    console.error("💥 Unexpected error:", error);
    res.status(500).json({ error: "Internal server error" });

    return;
  }
};

export const verifyTransaction = async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      res.status(400).json({ error: "Transaction reference is required" });

      return;
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const verificationData = response.data.data;

    res.status(200).json({
      success: true,
      message: "Verification successful",
      data: verificationData,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "💥 Paystack verification error:",
        error.response?.data || error.message
      );
      res.status(500).json({
        error: error.response?.data || "Paystack verification failed",
      });

      return;
    }

    console.error("💥 Unexpected error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPaystackBanks = async (_req: Request, res: Response) => {
  try {
    const response = await axios.get("https://api.paystack.co/bank", {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      params: {
        currency: "NGN",
        type: "nuban",
      },
    });

    res.status(200).json(response.data);
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
};

// 🧾 Create Subaccount
export const createSubaccount = async (_req: Request, res: Response) => {
  try {
    const response = await axios.post(
      "https://api.paystack.co/subaccount",
      {
        business_name: "Olatilewa Fragrance Store",
        account_number: "9163451913",
        bank_code: "999992",
        percentage_charge: 0,
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
      subaccount: response.data.data,
    });
  } catch (err: any) {
    console.error("💥 Subaccount error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to create subaccount" });
  }
};

// export const initializePayment = async (req: Request, res: Response) => {
//   console.log("⚡ initializePayment endpoint hit");
//   res.status(200).json({ message: "You're good bro 🎯" });
// };

// export const initializePayment = async (req: Request, res: Response) => {
//   try {
//     let {
//       email,
//       amount,
//       currency = "NGN",
//       subaccount = "ACCT_40m22ih8x2mb2b0",
//       callback_url = "http://localhost:3000/success/callback",
//       metadata = {},
//       bearer = "subaccount",
//     } = req.body;

//     if (!email || !amount || !subaccount) {
//       res.status(400).json({
//         error: "email, amount, and subaccount are required",
//       });

//       return;
//     }

//     // Make sure amount is number (in Naira)
//     amount = Number(amount);
//     if (isNaN(amount) || amount <= 0) {
//       res.status(400).json({ error: "Invalid amount" });

//       return;
//     }

//     // Calculate Paystack fee, add it to buyer's charge
//     // This ensures subaccount receives full amount (minus fee)
//     const paystackFee = amount * PERCENTAGE_FEE + FIXED_FEE;
//     const totalAmount = Math.ceil(amount + paystackFee);

//     // Convert Naira to Kobo for Paystack (1 Naira = 100 Kobo)
//     const amountInKobo = totalAmount * 100;

//     const reference = `tx_${createId()}`;

//     const payload = {
//       email,
//       amount: amountInKobo.toString(),
//       currency,
//       reference,
//       callback_url,
//       subaccount,
//       bearer,
//       metadata: JSON.stringify(metadata),
//     };

//     const response = await axios.post(
//       "https://api.paystack.co/transaction/initialize",
//       payload,
//       {
//         headers: {
//           Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     res.status(200).json({
//       success: true,
//       message: "Authorization URL created",
//       data: {
//         ...response.data.data,
//         totalAmountCharged: totalAmount,
//         originalAmount: amount,
//         paystackFee: Math.ceil(paystackFee),
//       },
//     });

//     return;
//   } catch (error) {
//     if (axios.isAxiosError(error)) {
//       console.error(
//         "💥 Paystack error:",
//         error.response?.data || error.message
//       );
//       res.status(500).json({
//         error: error.response?.data || "Paystack initialization failed",
//       });

//       return;
//     }
//     console.error("💥 Unexpected error:", error);
//     res.status(500).json({ error: "Internal server error" });
//     return;
//   }
// };
