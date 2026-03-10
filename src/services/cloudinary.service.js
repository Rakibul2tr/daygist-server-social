import cloudinary from "../config/cloudinary.js";

export function uploadBufferToCloudinary({ buffer, folder, resource_type }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type, // "image" | "video" | "auto"
        // optional transformations:
        // transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}
