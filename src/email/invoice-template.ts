export interface InvoiceItem {
  productName: string;
  quantity: number;
  price: number; // already number
}

export interface InvoiceOrder {
  id: string; // order.orderId
  name: string;
  email: string;
  createdAt: Date;
  discountAmount: number;
  totalAmount: number;
}

export const orderTemplate = (order: InvoiceOrder, items: InvoiceItem[]) => {
  return {
    subject: `Invoice for #${order.id}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice - #${order.id}</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333;">Invoice for #${order.id}</h2>
              <p><strong>Name:</strong> ${order.name}</p>
              <p><strong>Email:</strong> ${order.email}</p>
              <p><strong>Date:</strong> ${new Date(
                order.createdAt
              ).toLocaleDateString()}</p>
              <hr style="margin: 20px 0;">
              <h3>Order Items</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr>
                    <th style="border-bottom: 1px solid #ddd; padding: 8px; text-align:left;">Product</th>
                    <th style="border-bottom: 1px solid #ddd; padding: 8px; text-align:left;">Quantity</th>
                    <th style="border-bottom: 1px solid #ddd; padding: 8px; text-align:right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${items
                    .map(
                      (item) => `
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                        item.productName
                      }</td>
                      <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                        item.quantity
                      }</td>
                      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align:right;">
                        ₦${(item.price * item.quantity).toLocaleString()}
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
              <h3 style="margin-top: 20px;">Discount: ₦${order.discountAmount.toLocaleString()}</h3>
              <h3>Total: ₦${order.totalAmount.toLocaleString()}</h3>
              <p style="margin-top: 30px; font-size: 0.9em; color: #777; border-top: 1px solid #eee; padding-top: 20px;">
                  Thank you for shopping with us.<br>
                  Gempire
              </p>
          </div>
      </body>
      </html>
    `,
  };
};

export const confirmationTemplate = (
  order: InvoiceOrder,
  items: InvoiceItem[]
) => {
  return {
    subject: `Your #${order.id} has been delivered 🎉`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Order Delivered - #${order.id}</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333;">Order Delivered ✅</h2>
              <p>Hi ${order.name},</p>
              <p>Your <strong>#${
                order.id
              }</strong> has been successfully delivered.</p>
              <hr style="margin: 20px 0;" />
              <h3>Order Summary</h3>
              <ul style="padding-left: 20px; color: #555;">
                ${items
                  .map(
                    (item) => `
                    <li>
                      ${item.quantity} × ${item.productName} — ₦${(
                      item.price * item.quantity
                    ).toLocaleString()}
                    </li>`
                  )
                  .join("")}
              </ul>
              ${
                order.discountAmount && Number(order.discountAmount) > 0
                  ? `<p style="margin-top: 10px; font-weight: bold;">
                       Discount Applied: -₦${Number(
                         order.discountAmount
                       ).toLocaleString()}
                     </p>`
                  : ""
              }
              <h3>Total Paid: ₦${order.totalAmount.toLocaleString()}</h3>
              <p style="margin-top: 30px; font-size: 0.9em; color: #777; border-top: 1px solid #eee; padding-top: 20px;">
                  We hope you enjoy your purchase 💎<br />
                  Gempire
              </p>
          </div>
      </body>
      </html>
    `,
  };
};
