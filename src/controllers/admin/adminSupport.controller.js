import Ticket from "../../models/support/ticket.model.js";

// 🛠️ অ্যাডমিন প্যানেল থেকেটিকেটের উত্তর দেওয়া
export const adminReplyToTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { replyMessage, newStatus } = req.body; // newStatus can be "resolved" or "closed"
    const adminId = req.user._id;

    if (!replyMessage) {
      return res
        .status(400)
        .json({ success: false, message: "রিপ্লাই মেসেজ খালি রাখা যাবে না।" });
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        $set: {
          status: newStatus || "resolved",
          adminReply: {
            message: replyMessage,
            repliedAt: new Date(),
            repliedBy: adminId,
          },
        },
      },
      { new: true },
    ).populate("userId", "name email");

    if (!updatedTicket) {
      return res
        .status(404)
        .json({ success: false, message: "টিকেটটি পাওয়া যায়নি।" });
    }

    // 💡 টিপস: আপনি চাইলে এখানে নোটিফিকেশন বা ইমেইল পাঠানোর লজিক যুক্ত করতে পারেন
    // sendPushNotification(updatedTicket.userId._id, "আপনার টিকেটের উত্তর দেওয়া হয়েছে।");

    return res.json({
      success: true,
      message: "টিকেটের রিপ্লাই সফলভাবে পাঠানো হয়েছে।",
      data: updatedTicket,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
