import { Request, Response } from "express";
import { db } from "../db";
import { orders, orderItems, orderStatusEnum } from "../db/order-schema";
import { products } from "../db/product-schema";
import { createId } from "@paralleldrive/cuid2";
import { eq, inArray, desc } from "drizzle-orm";
import {
  AppError,
  throwBadRequest,
  throwNotFound,
  throwServerError,
} from "../utils/error";
import { generateHybridId } from "../utils/id";
import { productImages } from "../db/product-images-schema";
import redisClient from "../utils/redis";

// 1️⃣ Create new order
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { name, address, telephone, email, note } = req.body;
    let { items } = req.body;

    // 🛡️ Validate required fields
    if (!name || !address || !telephone || !email) {
      throwBadRequest("All fields are required");
    }

    // ✅ Parse items if it's a JSON string
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch (err) {
        throwBadRequest("Invalid cart items format");
      }
    }

    if (!Array.isArray(items) || items.length === 0) {
      throwBadRequest("At least one cart item is required");
    }

    // 🆔 Generate order ID
    const orderId = generateHybridId("order");
    const internalId = createId(); // This is the Drizzle _id

    // 📦 Insert the order
    await db.insert(orders).values({
      _id: internalId,
      orderId, // This is your public-facing orderId
      name,
      address,
      telephone,
      email,
      note,
    });

    // 🧾 Insert order items
    const orderItemsData = items.map((item: any) => {
      if (!item.productId || !item.unitPrice || !item.quantity) {
        throwBadRequest(
          "Each item must include productId, unitPrice, and quantity"
        );
      }

      return {
        _id: createId(),
        orderId: internalId, // Link to the internal ID of the order
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      };
    });

    await db.insert(orderItems).values(orderItemsData);

    // --- CACHE INVALIDATION ---
    // Invalidate the 'orders:all' cache as a new order has been created
    await redisClient.del("orders:all");
    // --- END CACHE INVALIDATION ---

    // ✅ Send success response
    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: { orderId }, // Respond with the public-facing orderId
    });
  } catch (error) {
    handleControllerError(error, res, "Failed to create order");
  }
};

// 2️⃣ Get ALL orders (for table display)
export const getOrders = async (_req: Request, res: Response) => {
  const cacheKey = "orders:all"; // Define cache key for all orders

  try {
    // 1. Check Redis cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      // console.log("Cache hit for all orders");
      res.status(200).json(JSON.parse(cached));
      return;
    }

    // 2. Cache miss → fetch from DB
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

    // 3. Store in Redis cache with TTL (e.g., 60 seconds)
    // Adjust TTL based on how frequently orders might change or need to be seen
    await redisClient.set(cacheKey, JSON.stringify(responsePayload), "EX", 60);

    res.status(200).json(responsePayload);
  } catch (error) {
    handleControllerError(error, res, "Failed to fetch orders");
  }
};

// 3️⃣ Get single order with items + product info

export const getOrderById = async (req: Request, res: Response) => {
  const { id } = req.params; // This `id` is your internal `_id` from Drizzle
  if (!id) throwBadRequest("Order ID is required");

  const cacheKey = `order:${id}`; // Define cache key for a single order

  try {
    // 1. Check Redis cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      // console.log(`Cache hit for order ${id}`);
      res.status(200).json(JSON.parse(cached));
      return;
    }

    // 2. Cache miss → fetch from DB
    // 🧾 Fetch the main order
    const [order] = await db.select().from(orders).where(eq(orders._id, id));
    if (!order) throwNotFound("Order not found");

    // 📦 Fetch all items in the order
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    const productIds = items.map((item) => item.productId);

    // 🧠 Fetch product details
    const allProducts = await db
      .select()
      .from(products)
      .where(inArray(products._id, productIds));

    // 🖼️ Fetch images for all involved products
    const allImages = await db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds));

    // 🧬 Attach images to each product
    const productMap = allProducts.reduce((acc, product) => {
      const images = allImages.filter((img) => img.productId === product._id);
      return {
        ...acc,
        [product._id]: {
          ...product,
          images, // ← this will be an array
        },
      };
    }, {} as Record<string, typeof products.$inferSelect & { images: typeof allImages }>);

    // 🧩 Attach product info (with images) to order items
    const itemsWithProduct = items.map((item) => ({
      ...item,
      product: productMap[item.productId] || null,
    }));

    const responsePayload = {
      success: true,
      message: "Order fetched successfully",
      data: {
        ...order,
        items: itemsWithProduct,
      },
    };

    // 3. Store in Redis cache with TTL (e.g., 60 seconds)
    await redisClient.set(cacheKey, JSON.stringify(responsePayload), "EX", 60);

    // ✅ Respond with order and enriched items
    res.status(200).json(responsePayload);
  } catch (error) {
    handleControllerError(error, res, "Failed to fetch order by ID");
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // This `id` is your internal `_id` from Drizzle
    const { status } = req.body;

    if (!id || !status) {
      throwBadRequest("Order ID and new status are required");
    }

    // validate status
    const validStatuses = orderStatusEnum.enumValues;
    if (!validStatuses.includes(status)) {
      throwBadRequest(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      );
    }

    // check if order exists
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders._id, id));

    if (!existingOrder) {
      throwNotFound("Order not found");
    }

    // update status
    const [updatedOrder] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders._id, id))
      .returning();

    // --- CACHE INVALIDATION ---
    // Invalidate the 'orders:all' cache as a status change might affect list order/view
    await redisClient.del("orders:all");
    // Invalidate the cache for this specific order
    await redisClient.del(`order:${id}`);
    // --- END CACHE INVALIDATION ---

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    handleControllerError(error, res, "Failed to update order status");
  }
};

// 🧠 Centralized error handler
function handleControllerError(
  error: unknown,
  res: Response,
  fallbackMsg: string
) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  } else {
    console.error("Unhandled error:", error);
    // Ensure throwServerError is properly handled to send a response
    // if this function doesn't already send one implicitly.
    // For now, let's make sure it just logs and doesn't try to send a new response
    // if res.json() has already been called by AppError.
    if (!res.headersSent) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null
          ? JSON.stringify(error)
          : "Unknown error";
      // This part was missing a res.status().json()
      res.status(500).json({
        success: false,
        message: `${fallbackMsg}: ${message}`,
      });
    }
  }
}
