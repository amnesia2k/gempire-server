import { Request, Response } from "express";
import { db } from "../db";
import { products } from "../db/product-schema";
import { orders, orderItems } from "../db/order-schema";
import { eq, sql } from "drizzle-orm";
import { AppError, throwServerError } from "../utils/error";
import { generateDateLabels } from "../utils/date-range";
import logger from "../utils/logger";

type SalesRow = {
  label: string;
  total: string;
};

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
    logger.error("Metrics error:", error);
    if (error instanceof AppError) {
      res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    } else {
      throwServerError("Failed to fetch metrics");
    }
  }
};

export const getSalesByPeriod = async (req: Request, res: Response) => {
  try {
    const period =
      req.query.period === "week"
        ? "week"
        : req.query.period === "day"
        ? "day"
        : "month";

    let dateTrunc = "month";
    let labelSQL = `to_char(date_trunc('month', o."createdAt"), 'FMMonth')`;
    let dateFilterSQL = `
      EXTRACT(YEAR FROM o."createdAt") = EXTRACT(YEAR FROM CURRENT_DATE)
    `;

    if (period === "week") {
      dateTrunc = "week";
      labelSQL = `('Week ' || to_char(date_trunc('week', o."createdAt"), 'FMWW'))`;
      dateFilterSQL = `
        DATE_TRUNC('month', o."createdAt") = DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lagos')
      `;
    } else if (period === "day") {
      dateTrunc = "day";
      labelSQL = `to_char(date_trunc('day', o."createdAt"), 'DD Mon')`;
      dateFilterSQL = `
        DATE_TRUNC('month', o."createdAt") = DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lagos')
      `;
    }

    const result = await db.execute(
      sql.raw(`
        SELECT 
          ${labelSQL} AS label,
          SUM(oi."unitPrice" * oi."quantity")::numeric(10, 2) AS total
        FROM "orders" o
        JOIN "order_items" oi ON o."_id" = oi."orderId"
        WHERE ${dateFilterSQL}
        GROUP BY label
        ORDER BY label
      `)
    );

    const rows = result.rows as SalesRow[];

    logger.info("Raw rows returned:", rows);

    const dataMap = new Map(
      rows.map((r) => [r.label.trim(), parseFloat(r.total)])
    );

    const allLabels = generateDateLabels(period);

    const responseData = {
      labels: allLabels,
      values: allLabels.map((label) => dataMap.get(label) || 0),
    };

    res.status(200).json({
      message: "Sales data fetched successfully",
      success: true,
      data: responseData,
    });
  } catch (error) {
    logger.error("Metrics error:", error);
    throwServerError("Failed to fetch metrics");
  }
};
