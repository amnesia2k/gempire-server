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
    const internalId = createId();

    // 📦 Insert the order
    await db.insert(orders).values({
      _id: internalId, // You forgot to use the actual internalId before 👀
      orderId,
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
        orderId: internalId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      };
    });

    await db.insert(orderItems).values(orderItemsData);

    // ✅ Send success response
    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: { orderId },
    });
  } catch (error) {
    handleControllerError(error, res, "Failed to create order");
  }
};

// 2️⃣ Get ALL orders (for table display)
export const getOrders = async (_req: Request, res: Response) => {
  try {
    const allOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt));

    if (allOrders.length === 0) throwNotFound("No orders found");

    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: allOrders,
    });
  } catch (error) {
    handleControllerError(error, res, "Failed to fetch orders");
  }
};

// 3️⃣ Get single order with items + product info

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) throwBadRequest("Order ID is required");

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

    // ✅ Respond with order and enriched items
    res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: {
        ...order,
        items: itemsWithProduct,
      },
    });
  } catch (error) {
    console.error("Failed to fetch order by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order details",
    });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null
        ? JSON.stringify(error)
        : "Unknown error";

    throwServerError(`${fallbackMsg}: ${message}`);
  }
}
