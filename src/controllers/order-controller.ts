import { Request, Response } from "express";
import { db } from "../db";
import {
  orders,
  orderItems,
  orderStatusEnum,
  deliveryMethodEnum,
} from "../db/order-schema";
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
    const { name, address, telephone, email, note, deliveryMethod } = req.body;
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

    await db.insert(orders).values({
      _id: internalId,
      orderId,
      name,
      address,
      telephone,
      email,
      note,
      deliveryMethod, // ✅ include it
    });

    const orderItemsData = items.map((item: any) => {
      if (!item.productId || !item.unitPrice || !item.quantity) {
        throwBadRequest(
          "Each item must include productId, unitPrice, and quantity"
        );
      }

      return {
        _id: createId(),
        orderId: internalId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      };
    });

    await db.insert(orderItems).values(orderItemsData);
    await redisClient.del("orders:all");

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: { orderId },
    });
  } catch (error) {
    handleControllerError(error, res, "Failed to create order");
  }
};

// 2️⃣ Get ALL orders
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

// 3️⃣ Get single order by ID
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

    const [order] = await db.select().from(orders).where(eq(orders._id, id));
    if (!order) throwNotFound("Order not found");

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
      return {
        ...acc,
        [product._id]: {
          ...product,
          images,
        },
      };
    }, {} as Record<string, typeof products.$inferSelect & { images: typeof allImages }>);

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

    await redisClient.set(cacheKey, JSON.stringify(responsePayload), "EX", 600);
    res.status(200).json(responsePayload);
  } catch (error) {
    handleControllerError(error, res, "Failed to fetch order by ID");
  }
};

// 4️⃣ Update Order Status
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

// 🧠 Central Error Handler
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
