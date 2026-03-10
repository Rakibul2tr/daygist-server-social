import express from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import {
  registerPushToken,
  unregisterPushToken,
} from "../../controllers/push/pushToken.controller.js";

const router = express.Router();

router.post("/register", authGuard, registerPushToken);
router.post("/unregister", authGuard, unregisterPushToken);

export default router;
