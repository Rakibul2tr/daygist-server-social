import mongoose from "mongoose";
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

    // ====================================================================
    // 🔄 অ্যাপ মডারেটর রাউন্ড-রবিন অ্যাসাইনমেন্ট লজিক (Monetization & Seller ফিক্স)
    // ====================================================================
    let assignedModId = null;

    const targetType = String(userType).trim().toLowerCase();

    // যদি টিকিটটি monetization অথবা seller ক্যাটাগরির হয়
    if (
      targetType === "monetization" ||
      targetType === "seller" ||
      targetType === "adviser"
    ) {
      // ১. প্ল্যাটফর্মের মেইন ACTIVE অ্যাপ মডারেটরদের লিস্ট বের করুন (যাদের sellerId নাই বা null)
      const activeAppModerators = await User.find({
        role: "MODERATOR",
        moderatorStatus: "active",
        $or: [{ sellerId: null }, { sellerId: { $exists: false } }], // 🎯 শুধু অ্যাপ স্টাফরা আসবে, শপ স্টাফরা না
      }).sort({ _id: 1 });

      console.log(
        `📡 [Ticket Debug]: একটিভ অ্যাপ মডারেটর পাওয়া গেছে: ${activeAppModerators.length} জন`,
      );

      if (activeAppModerators.length > 0) {
        // ২. এই ক্যাটাগরির শেষ টিকিটটি খুঁজুন যাতে অলরেডি কোনো অ্যাপ মডারেটর অ্যাসাইন করা ছিল
        const lastAssignedTicket = await Ticket.findOne({
          userType: { $in: ["monetization", "seller", "adviser"] },
          assignedModerator: { $ne: null },
        }).sort({ createdAt: -1 });

        if (!lastAssignedTicket || !lastAssignedTicket.assignedModerator) {
          // ৩. প্রথম টিকিট হলে তালিকার প্রথম মডারেটর দায়িত্ব পাবে
          assignedModId = activeAppModerators[0]._id;
        } else {
          // ৪. শেষ কোন স্টাফ টিকিট পেয়েছিল তার পজিশন বা ইনডেক্স বের করুন
          const lastModIdStr = lastAssignedTicket.assignedModerator.toString();
          const lastIndex = activeAppModerators.findIndex(
            (mod) => mod._id.toString() === lastModIdStr,
          );

          // ৫. রাউন্ড রবিন ফর্মুলা: পরের ইনডেক্স বের করা
          if (lastIndex === -1) {
            assignedModId = activeAppModerators[0]._id;
          } else {
            const nextIndex = (lastIndex + 1) % activeAppModerators.length;
            assignedModId = activeAppModerators[nextIndex]._id;
          }
        }
      }
    }

    const newTicket = await Ticket.create({
      userId,
      category,
      title,
      description,
      attachments: attachments || [],
      userType,
      assignedModerator: assignedModId,
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

    const filter = {
      userId: userId,
      isDeleted: { $ne: true }, // 👈 এটি ব্যবহার করুন
    };
    // ইউজারের সব টিকেট নতুন থেকে পুরনো ক্রমে খোঁজা
    const tickets = await Ticket.find(filter).sort({
      createdAt: -1,
    });

    return res.json({ success: true, data: tickets });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const replyToTicket = async (req, res) => {
  
  try {
    const userId = req.user?._id;
    const userRole = String(req.user?.role || "")
      .trim()
      .toUpperCase();
    const { ticketId } = req.params;
    const { text } = req.body;

    console.log("params", ticketId, text);

    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Reply text is required" });
    }

    // টিকিটটি খুঁজে বের করা
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    // 🔐 সিকিউরিটি চেক: মডারেটর হলে চেক করবে টিকিটটি তাকে অ্যাসাইনড কি না
    if (userRole === "MODERATOR") {
      if (String(ticket.assignedModerator) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not assigned to this ticket.",
        });
      }
    }
    //  ইউজার যদি সাধারণ কাস্টমার হয়, তবে সে শুধু তার নিজের টিকিটে রিপ্লাই দিতে পারবে
    else if (userRole === "USER") {
      if (String(ticket.userId) !== String(userId)) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied." });
      }
    }

    // 🎯 ৩. রিপ্লাই অবজেক্ট তৈরি এবং পুশ
    const newReply = {
      senderId: userId,
      senderRole: userRole,
      text: text.trim(),
      createdAt: new Date(),
    };

    ticket.replies.push(newReply);

    // স্টাফ বা অ্যাডমিন রিপ্লাই দিলে টিকিটের স্ট্যাটাস 'resolved' বা 'answered' আপডেট করতে পারেন (ঐচ্ছিক)
    if (userRole === "ADMIN" || userRole === "MODERATOR") {
      ticket.status = "answered"; // বা আপনার সিস্টেম অনুযায়ী (যেমন: "open", "closed", "resolved")
    } else {
      ticket.status = "pending"; // কাস্টমার আবার মেসেজ দিলে পেন্ডিং মোডে যাবে
    }

    await ticket.save();

    // পপুলেট করে ফ্রেশ রেসপন্স পাঠানো
    const updatedTicket = await Ticket.findById(ticket._id)
      .populate("userId", "name username avatar")
      .populate("replies.senderId", "name username avatar role")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Reply added successfully",
      data: updatedTicket,
    });
  } catch (error) {
    console.error("❌ replyToTicket error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTicket = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userRole = String(req.user?.role || "")
      .trim()
      .toUpperCase();
    const { ticketId } = req.params;

    console.log(
      "💥 [Direct Delete Triggered] ID:",
      ticketId,
      "By Role:",
      userRole,
    );

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ticketId" });
    }

    const ticketOID = new mongoose.Types.ObjectId(String(ticketId));
    const userOID = new mongoose.Types.ObjectId(String(userId));

    // ১. প্রথমে ডাটাবেজ থেকে টিকিটটি খুঁজুন
    const ticket = await Ticket.findById(ticketOID).lean();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found or already deleted",
      });
    }

    // ====================================================================
    // 🔐 ২. রোল ভিত্তিক সিকিউরিটি ও পারমিশন ভেরিফিকেশন লজিক
    // ====================================================================
    let hasPermission = false;

    if (userRole === "ADMIN" || userRole === "SUPPER ADMIN") {
      hasPermission = true;
    } else if (userRole === "MODERATOR") {
      if (
        ticket.assignedModerator &&
        String(ticket.assignedModerator) === String(userOID)
      ) {
        hasPermission = true;
      } else {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You can only delete tickets assigned to you.",
        });
      }
    } else if (userRole === "USER") {
      if (ticket.userId && String(ticket.userId) === String(userOID)) {
        hasPermission = true;
      } else {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You cannot delete someone else's ticket.",
        });
      }
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Unauthorized action.",
      });
    }

    // ====================================================================
    // 🎯 ৩. ডাইরেক্ট ডিলিট এক্সিকিউশন (Hard Delete - No more fields checking)
    // ====================================================================
    await Ticket.findByIdAndDelete(ticketOID);

    console.log(
      "🚀 [Delete Confirmed]: Ticket wiped out from Database permanently.",
    );

    return res.status(200).json({
      success: true,
      message: "Ticket has been permanently deleted from the system.",
      ticketId: ticketOID,
    });
  } catch (error) {
    console.error("❌ deleteTicket error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};