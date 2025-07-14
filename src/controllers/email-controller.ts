import { Request, Response } from "express";
import axios from "axios";
import logger from "../utils/logger";

export const sendEmail = async (req: Request, res: Response) => {
  const { name, email, message } = req.body;

  logger.info("📧 Sending email...", req.body);

  if (!name || !email || !message) {
    res.status(400).json({ error: "Missing required fields." });

    return;
  }

  try {
    const emailjsResponse = await axios.post(
      "https://api.emailjs.com/api/v1.0/email/send",
      {
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_USER_ID,
        template_params: {
          from_name: name,
          reply_to: email,
          message,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ EmailJS response:", emailjsResponse.data);

    res.status(200).json({
      success: true,
      message: "Email sent successfully!",
    });
  } catch (error: any) {
    console.error(
      "❌ Email sending failed:",
      JSON.stringify(error.response?.data || error.message, null, 2)
    );

    res.status(500).json({
      success: false,
      error: "Failed to send email. Please try again later.",
    });
  }
};
