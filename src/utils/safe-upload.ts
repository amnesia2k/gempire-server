import cloudinary from "./cloudinary";
import sharp from "sharp";
import { throwBadRequest } from "./error";

export async function safeUploadToCloudinary(
  file: Express.Multer.File,
  retries = 2
): Promise<{ url: string; publicId: string }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const compressedBuffer = await sharp(file.buffer)
        .resize({ width: 600 })
        .webp({ quality: 80 })
        .toBuffer();

      const result = await new Promise<{
        secure_url: string;
        public_id: string;
      }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "gempire-products",
            resource_type: "image",
            format: "webp",
          },
          (err, result) => {
            if (err || !result) return reject(err);
            resolve({
              secure_url: result.secure_url!,
              public_id: result.public_id!,
            });
          }
        );

        uploadStream.end(compressedBuffer);
      });

      return { url: result.secure_url, publicId: result.public_id };
    } catch (err: any) {
      if (attempt === retries) {
        const readable =
          err?.message || err?.name || "Unknown Cloudinary error";
        throw throwBadRequest(`Cloudinary upload failed: ${readable}`);
      }

      await wait(1000);
    }
  }

  throw throwBadRequest("Cloudinary upload failed after multiple attempts");
}

function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
