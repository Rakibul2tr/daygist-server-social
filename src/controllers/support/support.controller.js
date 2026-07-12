import Ticket from "../../models/support/ticket.model.js";
import User from "../../models/user/user.model.js";

// 🟢 ১. সাধারণ ইউজারের জন্য টিকেট তৈরি করা (Report a Problem)
export const createTicket = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category, title, description, attachments } = req.body; // attachments = [{url, key}] (Wasabi)

    if (!category || !title || !description) {
      return res
        .status(400)
        .json({ success: false, message: "সবগুলো ঘর সঠিকভাবে পূরণ করুন।" });
    }

    const newTicket = await Ticket.create({
      userId,
      category,
      title,
      description,
      attachments: attachments || [],
    });

    return res.status(201).json({
      success: true,
      message:
        "আপনার টিকেটটি সফলভাবে জমা হয়েছে। ২৪-৪৮ ঘণ্টার মধ্যে অ্যাডমিন টিম রিভিউ করবে।",
      data: newTicket,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 🔵 ২. ইউজার তার নিজের টিকেটের তালিকা ও অ্যাডমিন রিপ্লাই দেখা
export const getUserTickets = async (req, res) => {
  try {
    const userId = req.user._id;

    // ইউজারের সব টিকেট নতুন থেকে পুরনো ক্রমে খোঁজা
    const tickets = await Ticket.find({ userId }).sort({ createdAt: -1 });

    return res.json({ success: true, data: tickets });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


