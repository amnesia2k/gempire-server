import { env } from "../utils/env";
import { sendEmail } from "./email";
import {
  orderTemplate,
  InvoiceOrder,
  InvoiceItem,
  confirmationTemplate,
} from "./invoice-template";

export const sendInvoiceEmail = async (
  order: InvoiceOrder,
  items: InvoiceItem[]
): Promise<void> => {
  try {
    const { subject, html } = orderTemplate(order, items);

    await sendEmail({
      from: `"Gempire" <${env.EMAIL_USER}>`,
      to: order.email,
      subject,
      html,
      text: `Invoice for Order #${order.id}, Total: ₦${order.totalAmount}`,
    });
  } catch (error) {
    console.error(error);
    throw new Error("Failed to send invoice email");
  }
};

export const sendConfirmationEmail = async (
  order: InvoiceOrder,
  items: InvoiceItem[]
): Promise<void> => {
  try {
    const { subject, html } = confirmationTemplate(order, items);

    await sendEmail({
      from: `"Gempire" <${env.EMAIL_USER}>`,
      to: order.email,
      subject,
      html,
      text: `Order #${order.id} has been delivered. Total: ₦${order.totalAmount}`,
    });
  } catch (error) {
    console.error(error);
    throw new Error("Failed to send confirmation email");
  }
};
