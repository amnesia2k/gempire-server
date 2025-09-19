import { Queue } from "bullmq";
import { redisOptions } from "../utils/redis";

export const invoiceQueue = new Queue("invoiceQueue", {
  connection: redisOptions,
});

export const confirmationQueue = new Queue("confirmationQueue", {
  connection: redisOptions,
});
