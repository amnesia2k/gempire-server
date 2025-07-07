import { Request, Response } from "express";
import { db } from "../db";
import { products } from "../db/product-schema";
import { orders, orderItems } from "../db/order-schema";
import { eq, sql } from "drizzle-orm";
import { AppError, throwServerError } from "../utils/error";

export const getMetrics = async (_req: Request, res: Response) => {
  try {
    // ✅ Use `sql<number>` for aggregation
    const [{ count: productCount }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(products);

    const [{ count: orderCount }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orders);

    const [{ count: pendingCount }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(eq(orders.status, "ordered"));

    const [{ totalSales }] = await db
      .select({
        totalSales: sql<number>`SUM(${orderItems.unitPrice} * ${orderItems.quantity})`,
      })
      .from(orderItems);

    const metrics = {
      totalProducts: productCount ?? 0,
      totalOrders: orderCount ?? 0,
      pendingOrders: pendingCount ?? 0,
      totalSales: totalSales ?? 0, // ⚠️ raw number (for chart friendliness)
    };

    res.status(200).json({
      message: "Metrics fetched successfully",
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error("Metrics error:", error);
    if (error instanceof AppError) {
      res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    } else {
      throwServerError("Failed to fetch metrics");
    }
  }
};
