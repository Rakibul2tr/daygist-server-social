import express from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import {
  requestWithdraw,
  getMyWithdraws,
} from "../../controllers/withdraw/withdraw.controller.js";

const router = express.Router();

router.post("/request", authGuard, requestWithdraw);
router.get("/me", authGuard, getMyWithdraws);


export default router;
