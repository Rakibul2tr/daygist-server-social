import express from "express";


import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin, isAdminOrModerator } from "../../middleware/isAdminMiddleware.js";
import { createTicket, deleteTicket, getUserTickets, replyToTicket } from "../../controllers/support/support.controller.js";
import {
  getAdminModeratorTickets,
} from "../../controllers/admin/adminSupport.controller.js";


const router = express.Router();

// 📱 ইউজার এন্ডপয়েন্টস (React Native App)
router.post("/ticket/create", authGuard, createTicket); // টিকেট সাবমিট
router.get("/ticket/my-list", authGuard, getUserTickets);

// 🛠️ অ্যাডমিন এন্ডপয়েন্টস (Next.js Admin Panel)
router.put("/ticket/user-reply/:ticketId",authGuard,  replyToTicket);
router.put(
  "/admin/ticket/reply/:ticketId",
  authGuard,
  isAdminOrModerator,
  replyToTicket,
);

router.delete("/ticket-delete/:ticketId", authGuard, deleteTicket);

router.get("/admin/tickets", authGuard,isAdminOrModerator, getAdminModeratorTickets);

export default router;
