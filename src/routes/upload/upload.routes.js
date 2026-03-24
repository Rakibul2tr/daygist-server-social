// FILE: src/routes/upload/upload.routes.js
import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { deleteUploadedFile, signedUrl, uploadImage, uploadImageCloudinary, uploadVideo, uploadVideoCloudinary, uploadVoice } from "../../controllers/upload/upload.controller.js";
import { authGuard } from "../../middleware/authMiddleware.js";
const router = Router();

/* ----------------------- IMAGE (your existing) ----------------------- */
const uploadImg = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new Error("Only image files allowed"));
    }
    cb(null, true);
  },
});

router.post("/image",authGuard, uploadImg.single("file"), uploadImage);

/* ----------------------- VIDEO (recommended) ----------------------- */
const TMP_DIR = path.join(process.cwd(), "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const uploadVid = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, TMP_DIR),
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 300 * 1024 * 1024 }, // ✅ 300MB (change as you want)
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("video/")) {
      return cb(new Error("Only video files allowed"));
    }
    cb(null, true);
  },
});

router.post("/video",authGuard, uploadVid.single("file"), uploadVideo);


// example
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});
router.post("/voice", authGuard, upload.single("file"), uploadVoice);

// for image showing signed url
// route
router.get("/signed", authGuard, signedUrl);

// delete media only with key
router.delete("/delete", authGuard, deleteUploadedFile);

// ✅ Cloudinary


router.post("/cloud/image", upload.single("file"), uploadImageCloudinary);
router.post("/cloud/video", upload.single("file"), uploadVideoCloudinary);




export default router;
