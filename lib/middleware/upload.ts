import streamifier from "streamifier";
import cloudinary from "@/lib/config/cloudinary";

type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  [key: string]: unknown;
};

export const uploadToCloudinary = (buffer: Buffer, folder = "ecom"): Promise<CloudinaryUploadResult> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err: unknown, result: CloudinaryUploadResult) => {
        if (err) return reject(err);
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
