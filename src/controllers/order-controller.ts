import { Request, Response } from "express";
import { db } from "../db";
import { orders, orderItems, orderStatusEnum } from "../db/order-schema";
import { products } from "../db/product-schema";
import { createId } from "@paralleldrive/cuid2";
import { eq, inArray, desc } from "drizzle-orm";
import { AppError, throwBadRequest, throwNotFound } from "../utils/error";
import { generateHybridId } from "../utils/id";
import { productImages } from "../db/product-images-schema";
import redisClient from "../utils/redis";
import logger from "../utils/logger";
import { promoCodes } from "../db/promo-schema";

// ------------------------
// CREATE ORDER
// ------------------------
export const createOrder = async (req: Request, res: Response) => {
  try {
    const {
      name,
      address,
      telephone,
      email,
      note,
      deliveryMethod,
      promoCodeId, // <-- Added promoCodeId here
    } = req.body;
    let { items } = req.body;

    if (!name || !address || !telephone || !email) {
      throwBadRequest("All fields are required");
    }

    if (!["delivery", "pickup"].includes(deliveryMethod)) {
      throwBadRequest(
        "Invalid delivery method. Must be 'delivery' or 'pickup'"
      );
    }

    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        throwBadRequest("Invalid cart items format");
      }
    }

    if (!Array.isArray(items) || items.length === 0) {
      throwBadRequest("At least one cart item is required");
    }

    const orderId = generateHybridId("order");
    const internalId = createId();

    await db.transaction(async (tx) => {
      // 🔎 Fetch product info
      const productIds = items.map(
        (item: { productId: string }) => item.productId
      );
      const productsInDB = await tx
        .select({
          id: products._id,
          stock: products.unit,
          price: products.price,
        })
        .from(products)
        .where(inArray(products._id, productIds));

      let subtotal = 0;

      // 🚨 Validate and calculate subtotal
      for (const item of items) {
        const product = productsInDB.find((p) => p.id === item.productId);
        if (!product) {
          throwBadRequest(`Product with ID ${item.productId} not found`);
        }
        if (product && product.stock < item.quantity) {
          throwBadRequest(`Not enough stock for product ${item.productId}`);
        }

        subtotal += parseFloat(item.unitPrice) * item.quantity;
      }

      // 💰 Handle Promo Code
      let discountAmount = 0;
      let appliedPromoCodeId = null; // Initialize to null

      if (promoCodeId) {
        const [promo] = await tx
          .select()
          .from(promoCodes)
          .where(eq(promoCodes._id, promoCodeId));

        if (!promo || !promo.isActive) {
          throwBadRequest("Invalid or inactive promo code");
        }

        const discountValue = parseFloat(promo.discount);
        if (promo.isPercentage) {
          discountAmount = (discountValue / 100) * subtotal;
        } else {
          discountAmount = discountValue;
        }

        if (discountAmount > subtotal) {
          discountAmount = subtotal; // Discount cannot exceed subtotal
        }
        appliedPromoCodeId = promo._id; // Store the actual promo code ID
      }

      const total = subtotal - discountAmount;
      if (total < 0) {
        // Should ideally not happen if discountAmount is capped at subtotal
        // But as a safeguard
        throwBadRequest("Calculated total is negative, something went wrong.");
      }

      // 🧾 Create order
      await tx.insert(orders).values({
        _id: internalId,
        orderId,
        name,
        address,
        telephone,
        email,
        note: note || null,
        deliveryMethod,
        promoCodeId: appliedPromoCodeId, // Use the determined appliedPromoCodeId
        discountAmount: discountAmount.toFixed(2), // Store calculated discount
      });

      // 🛒 Update inventory and create order items
      const orderItemsData = [];

      for (const item of items) {
        const product = productsInDB.find((p) => p.id === item.productId);
        // Ensure product is found before attempting to update stock
        if (product) {
          await tx
            .update(products)
            .set({ unit: product.stock - item.quantity })
            .where(eq(products._id, item.productId));
        }

        orderItemsData.push({
          _id: createId(),
          orderId: internalId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      }

      await tx.insert(orderItems).values(orderItemsData);
    });

    await redisClient.del("orders:all"); // Invalidate all orders cache

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: { orderId },
    });
  } catch (error) {
    handleControllerError(error, res, "Failed to create order");
  }
};

// ------------------------
// GET ALL ORDERS
// ------------------------
export const getOrders = async (_req: Request, res: Response) => {
  const cacheKey = "orders:all";

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      res.status(200).json(JSON.parse(cached));
      return;
    }

    const allOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt));

    if (allOrders.length === 0) throwNotFound("No orders found");

    const responsePayload = {
      success: true,
      message: "Orders fetched successfully",
      data: allOrders,
    };

    await redisClient.set(cacheKey, JSON.stringify(responsePayload), "EX", 600);
    res.status(200).json(responsePayload);
  } catch (error) {
    handleControllerError(error, res, "Failed to fetch orders");
  }
};

// ------------------------
// GET SINGLE ORDER BY ID
// ------------------------
export const getOrderById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throwBadRequest("Order ID is required");

  const cacheKey = `order:${id}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      res.status(200).json(JSON.parse(cached));
      return;
    }

    // Include promoCode relation in the query
    const [order] = await db
      .select()
      .from(orders)
      .leftJoin(promoCodes, eq(orders.promoCodeId, promoCodes._id))
      .where(eq(orders._id, id));

    if (!order) throwNotFound("Order not found");

    // Drizzle's select with joins might return nested objects or flattened.
    // Adjust order object based on how Drizzle constructs the result.
    const orderData = {
      ...order.orders,
      promoCode: order.promo_codes, // Drizzle typically aliases joined tables
    };

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));
    const productIds = items.map((item) => item.productId);

    const allProducts = await db
      .select()
      .from(products)
      .where(inArray(products._id, productIds));

    const allImages = await db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds));

    const productMap = allProducts.reduce((acc, product) => {
      const images = allImages.filter((img) => img.productId === product._id);
      acc[product._id] = { ...product, images };
      return acc;
    }, {} as Record<string, typeof products.$inferSelect & { images: typeof allImages }>);

    const itemsWithProduct = items.map((item) => ({
      ...item,
      product: productMap[item.productId] || null,
    }));

    const responsePayload = {
      success: true,
      message: "Order fetched successfully",
      data: {
        ...orderData,
        items: itemsWithProduct,
      },
    };

    await redisClient.set(cacheKey, JSON.stringify(responsePayload), "EX", 600);
    res.status(200).json(responsePayload);
  } catch (error) {
    handleControllerError(error, res, "Failed to fetch order by ID");
  }
};

// ------------------------
// UPDATE ORDER STATUS
// ------------------------
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      throwBadRequest("Order ID and new status are required");
    }

    const validStatuses = orderStatusEnum.enumValues;
    if (!validStatuses.includes(status)) {
      throwBadRequest(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      );
    }

    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders._id, id));
    if (!existingOrder) throwNotFound("Order not found");

    const [updatedOrder] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders._id, id))
      .returning();

    // 🧹 Invalidate related caches
    await redisClient.del("orders:all");
    await redisClient.del(`order:${id}`);

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    handleControllerError(error, res, "Failed to update order status");
  }
};

// ------------------------
// ERROR HANDLER
// ------------------------
function handleControllerError(
  error: unknown,
  res: Response,
  fallbackMsg: string
) {
  if (error instanceof AppError) {
    res
      .status(error.statusCode)
      .json({ success: false, message: error.message });
  } else {
    logger.error("Unhandled error:", error);
    if (!res.headersSent) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null
          ? JSON.stringify(error)
          : "Unknown error";

      res.status(500).json({
        success: false,
        message: `${fallbackMsg}: ${message}`,
      });
    }
  }
}
