import Ticket from "../../models/support/ticket.model.js";
import User from "../../models/user/user.model.js";

// 🟢 ১. সাধারণ ইউজারের জন্য টিকেট তৈরি করা (Report a Problem)
export const createTicket = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category, title, description, attachments, userType } = req.body; // attachments = [{url, key}] (Wasabi)

    if (!title || !description || !userType) {
      return res
        .status(400)
        .json({ success: false, message: "all fields are required" });
    }

    const newTicket = await Ticket.create({
      userId,
      category,
      title,
      description,
      attachments: attachments || [],
      userType,
    });

    return res.status(201).json({
      success: true,
      message:
        "Your ticket has been created successfully. Our support team will get back to you soon.",
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


