import Ticket from "../../models/support/ticket.model.js";

// 🛠️ অ্যাডমিন প্যানেল থেকেটিকেটের উত্তর দেওয়া
export const getAdminModeratorTickets = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userRole = String(req.user?.role || "")
      .trim()
      .toUpperCase();

      console.log("req.query.status", req.query.status);

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    let filter = {};

    // 🔐 সিকিউরিটি ফিল্টার: রোল অনুযায়ী টিকিট নির্ধারণ
    if (userRole === "ADMIN" || userRole === "SUPPER ADMIN") {
      // অ্যাডমিন বা সুপার অ্যাডমিন সিস্টেমের সমস্ত টিকিট দেখতে পাবে
      filter = {};
    } else if (userRole === "MODERATOR") {
      // 🎯 অ্যাপ মডারেটর শুধুমাত্র তাকে অ্যাসাইন করা টিকিটগুলো দেখতে পাবে
      filter = { assignedModerator: userId };
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins or App Staff only.",
      });
    }

    // যদি কাস্টম স্ট্যাটাস ফিল্টার থাকে (যেমন: ?status=open)
    if (req.query.status) {
      filter.status = String(req.query.status).trim();
    }

    // ডাটা কোয়েরি এবং টোটাল কাউন্ট একসাথে করা
    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate("userId", "name username email avatar") // যে ইউজার টিকিট কাটল
        .populate("assignedModerator", "name email role") // দায়িত্বপ্রাপ্ত মডারেটর
        .sort({ updatedAt: -1 }) // নতুন মেসেজ আসা টিকিট আগে দেখাবে
        .skip(skip)
        .limit(limit)
        .lean(),
      Ticket.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: tickets,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + tickets.length < total,
      },
    });
  } catch (error) {
    console.error("❌ getAdminModeratorTickets error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
