import nodemailer from "nodemailer";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async ({
  from = `"Gempire" <${env.EMAIL_USER}>`,
  to,
  subject,
  html,
  text,
}: SendEmailParams): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      // host: env.EMAIL_HOST,
      // port: Number(env.EMAIL_PORT),
      // secure: env.EMAIL_SECURE === "true",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
    } as nodemailer.TransportOptions);

    await transporter
      .verify()
      .then(() => {
        logger.info("✅ SMTP connection OK");
      })
      .catch((err) => {
        logger.error("❌ SMTP connection failed:", err);
      });

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });
  } catch (error) {
    throw error;
  }
};
