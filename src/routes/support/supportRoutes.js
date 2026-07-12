import express from "express";


import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";
import { createTicket, getUserTickets } from "../../controllers/support/support.controller.js";
import { adminReplyToTicket } from "../../controllers/admin/adminSupport.controller.js";


const router = express.Router();

// 📱 ইউজার এন্ডপয়েন্টস (React Native App)
router.post("/ticket/create", authGuard, createTicket); // টিকেট সাবমিট
router.get("/ticket/my-list", authGuard, getUserTickets);

// 🛠️ অ্যাডমিন এন্ডপয়েন্টস (Next.js Admin Panel)
router.put(
  "/admin/ticket/reply/:ticketId",
  authGuard,
  isAdmin,
  adminReplyToTicket,
);

export default router;
