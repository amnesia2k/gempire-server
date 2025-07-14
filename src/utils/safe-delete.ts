import cloudinary from "./cloudinary";
import { throwBadRequest } from "./error";

export async function safeDeleteFromCloudinary(
  publicId: string,
  retries = 5
): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
      });
      return;
    } catch (err: any) {
      if (attempt === retries) {
        const readable =
          err?.message || err?.name || "Unknown Cloudinary error";
        throw throwBadRequest(`Cloudinary deletion failed: ${readable}`);
      }
      await wait(1000); // cool-off between retries
    }
  }

  throw throwBadRequest("Cloudinary deletion failed after multiple attempts");
}

function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
