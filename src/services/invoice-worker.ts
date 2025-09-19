import { Worker } from "bullmq";
import { db } from "../db/index.js";
import { orders, orderItems } from "../db/order-schema.js";
import { products } from "../db/product-schema.js";
import { eq, inArray } from "drizzle-orm";
import { redisOptions } from "../utils/redis.js";
import { sendInvoiceEmail } from "../email/email-service";
import { logger } from "../utils/logger.js";

export const invoiceWorker = new Worker(
  "invoiceQueue",
  async (job) => {
    logger.info("🚀 Worker received job:", job.data);

    const { orderId } = job.data;

    logger.info("🔍 Fetching order from DB...");
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders._id, orderId));
    logger.info("✅ Order fetched:", order);

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
    logger.info("📦 Order items:", items);

    const productIds = items.map((i) => i.productId);
    const productData = await db
      .select()
      .from(products)
      .where(inArray(products._id, productIds));
    logger.info("🛒 Products:", productData);

    const itemsWithProduct = items.map((i) => ({
      productName:
        productData.find((p) => p._id === i.productId)?.name || "Unknown",
      quantity: i.quantity,
      price: Number(i.unitPrice),
    }));
    logger.info("📝 Items with product info:", itemsWithProduct);

    const total = itemsWithProduct.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );
    const discount = Number(order.discountAmount) || 0;

    const orderSummary = {
      id: order.orderId,
      name: order.name,
      email: order.email,
      createdAt: order.createdAt,
      discountAmount: discount,
      totalAmount: total - discount,
    };
    logger.info("📧 Sending invoice email to:", orderSummary.email);

    await sendInvoiceEmail(orderSummary, itemsWithProduct);

    logger.info("✅ Email send complete.");
    return { status: "sent" };
  },
  { connection: redisOptions }
);

// Worker events
invoiceWorker.on("active", (job) => {
  logger.info(`⚡ Job started: ${job.id}`);
});

invoiceWorker.on("completed", (job) => {
  logger.info(`✅ Invoice email sent for order ${job.data.orderId}`);
});

invoiceWorker.on("failed", (job, err) => {
  logger.error(
    `❌ Failed to send invoice for order ${job?.data?.orderId}:`,
    err
  );
});
