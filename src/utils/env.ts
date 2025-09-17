import dotenv from "dotenv";
dotenv.config();

export const env = {
  API_URL: process.env.API_URL!,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME!,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY!,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET!,
  DATABASE_URL: process.env.DATABASE_URL!,
  FLW_SECRET_KEY: process.env.FLW_SECRET_KEY!,
  JWT_SECRET: process.env.JWT_SECRET!,
  NODE_ENV: process.env.NODE_ENV!,
  PORT: process.env.PORT! || 8000,
  REDIS_HOST: process.env.REDIS_HOST!,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD!,
  PSTK_SECRET_KEY: process.env.PSTK_SECRET_KEY!,
  REDIS_PORT: process.env.REDIS_PORT!,
  REDIS_TLS: process.env.REDIS_TLS!,
  REDIS_URL: process.env.REDIS_URL!,
};
