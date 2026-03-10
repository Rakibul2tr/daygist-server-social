import uploadToWasabi, { getWasabiSignedUrl, uploadToWasabiStream } from "../../services/wbUpload.service.js";
import fs from "fs";
import { unlink } from "fs/promises";
import { uploadBufferToCloudinary } from "../../services/cloudinary.service.js";


export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: "file missing" });
    }

    const result = await uploadToWasabi({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      folder: "images",
    });

    // ✅ provider attach
    return res.json({ ok: true, provider: "wasabi", ...result });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "upload failed" });
  }
};



export const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: "file missing" });
    }

    const stream = fs.createReadStream(req.file.path);

    const result = await uploadToWasabiStream({
      stream,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      folder: "videos",
    });

    await unlink(req.file.path).catch(() => {});

    // ✅ provider attach
    return res.json({ ok: true, provider: "wasabi", ...result });
  } catch (e) {
    if (req?.file?.path) {
      await unlink(req.file.path).catch(() => {});
    }

    return res
      .status(500)
      .json({ ok: false, message: e?.message || "upload failed" });
  }
};


// for image showing
export const signedUrl = async (req, res) => {
  try {
    const key = String(req.query.key || "");
      // console.log("key", key);
    const url = await getWasabiSignedUrl(key, 3600); // 1 hour
    // console.log('url',url);
    
    return res.json({ ok: true, url });
  } catch (e) {
    return res.status(400).json({ ok: false, message: e?.message });
  }
};



// cloudinary upload api
export const uploadImageCloudinary = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ ok: false, message: "file missing" });

    const result = await uploadBufferToCloudinary({
      buffer: req.file.buffer,
      folder: "daygist/images",
      resource_type: "image",
    });

    return res.json({
      ok: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      format: result.format,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "upload failed" });
  }
};

export const uploadVideoCloudinary = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ ok: false, message: "file missing" });

    const result = await uploadBufferToCloudinary({
      buffer: req.file.buffer,
      folder: "daygist/videos",
      resource_type: "video",
    });

    return res.json({
      ok: true,
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration, // seconds
      bytes: result.bytes,
      format: result.format,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "upload failed" });
  }
};



