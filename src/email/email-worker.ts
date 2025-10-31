import { eventBus } from '../utils/event-bus'
import { db } from '../db/index.js'
import { orders, orderItems } from '../db/order-schema.js'
import { products } from '../db/product-schema.js'
import { eq, inArray } from 'drizzle-orm'
import { sendInvoiceEmail, sendConfirmationEmail } from '../email/email-service'
import { logger } from '../utils/logger.js'

const fetchOrderAndItems = async (orderId: string) => {
  const [order] = await db.select().from(orders).where(eq(orders._id, orderId))
  if (!order) throw new Error('Order not found')

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId))
  const productIds = items.map((i) => i.productId)
  const productData = await db.select().from(products).where(inArray(products._id, productIds))

  const itemsWithProduct = items.map((i) => ({
    productName: productData.find((p) => p._id === i.productId)?.name || 'Unknown',
    quantity: i.quantity,
    price: Number(i.unitPrice),
  }))

  const total = itemsWithProduct.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const discount = Number(order.discountAmount) || 0

  const orderSummary = {
    id: order.orderId,
    name: order.name,
    email: order.email,
    createdAt: order.createdAt,
    discountAmount: discount,
    totalAmount: total - discount,
  }

  return { orderSummary, itemsWithProduct }
}

// Invoice Email Listener
eventBus.on('invoiceEmail', async ({ orderId }) => {
  try {
    logger.info(`🚀 Sending invoice email for order ${orderId}`)
    const { orderSummary, itemsWithProduct } = await fetchOrderAndItems(orderId)
    await sendInvoiceEmail(orderSummary, itemsWithProduct)
    logger.info(`✅ Invoice email sent for order ${orderId}`)
  } catch (err) {
    logger.error(`❌ Failed to send invoice email for order ${orderId}:`, err)
  }
})

// Confirmation Email Listener
eventBus.on('confirmationEmail', async ({ orderId }) => {
  try {
    logger.info(`🚀 Sending confirmation email for order ${orderId}`)
    const { orderSummary, itemsWithProduct } = await fetchOrderAndItems(orderId)
    await sendConfirmationEmail(orderSummary, itemsWithProduct)
    logger.info(`✅ Confirmation email sent for order ${orderId}`)
  } catch (err) {
    logger.error(`❌ Failed to send confirmation email for order ${orderId}:`, err)
  }
})
