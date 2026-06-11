import express from "express";

import { authGuard } from "../../middleware/authMiddleware.js";
import { getTransactionHistory, manageBalance } from "../../controllers/transaction/transaction.controller.js";
const router = express.Router();
// POST: /api/balance/manage
router.post("/manage", authGuard, manageBalance);
router.get("/history", authGuard, getTransactionHistory);

export default router;
