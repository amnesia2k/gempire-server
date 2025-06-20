import cloudinary from "./cloudinary";
import { throwBadRequest } from "./error";

export async function safeUploadToCloudinary(
  file: Express.Multer.File,
  retries = 2
): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "products",
            width: 600,
            height: 600,
          },
          (err, result) => {
            if (err || !result) return reject(err);
            resolve(result.secure_url);
          }
        );

        uploadStream.end(file.buffer);
      });

      return url;
    } catch (err: any) {
      const isLastAttempt = attempt === retries;

      if (isLastAttempt) {
        const readable =
          err?.message || err?.name || "Unknown Cloudinary error";
        throw throwBadRequest(`Cloudinary upload failed: ${readable}`);
      }

      console.warn(
        `Upload attempt ${attempt + 1} failed. Retrying...`,
        err?.message ?? err
      );

      await wait(1000); // backoff before retry
    }
  }

  throw throwBadRequest("Cloudinary upload failed after multiple attempts");
}

function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
