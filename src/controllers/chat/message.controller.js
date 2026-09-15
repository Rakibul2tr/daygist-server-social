import mongoose from "mongoose";
import Conversation from "../../models/chat/conversation.model.js";
import Message from "../../models/chat/message.model.js";
import Follow from "../../models/follow/follow.model.js";
import User from "../../models/user/user.model.js";
import { deleteFromWasabi } from "../../services/wbUpload.service.js";
import Block from "../../models/chat/block.model.js";

const toOID = (id) => new mongoose.Types.ObjectId(String(id));

const parseCursor = (raw) => {
  try {
    if (!raw) return null;
    if (typeof raw === "string") return JSON.parse(raw);
    return raw;
  } catch {
    return null;
  }
};

const buildRelCursorFilter = (cursor) => {
  if (!cursor?.relAt || !cursor?.otherId) return null;

  const relAt = new Date(cursor.relAt);
  const oid = toOID(cursor.otherId);

  return {
    $or: [{ relAt: { $lt: relAt } }, { relAt, _id: { $lt: oid } }],
  };
};
/**
 * Helper: check if user is a participant of conversation
 */
const ensureParticipant = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId).lean();

  if (!conversation) {
    return { ok: false, status: 404, message: "Conversation not found" };
  }

  const isParticipant = conversation.participants.some(
    (id) => String(id) === String(userId),
  );

  if (!isParticipant) {
    return {
      ok: false,
      status: 403,
      message: "You are not allowed to access this conversation",
    };
  }

  return { ok: true, conversation };
};

// get massage by pere
// export const getMessagesByConversation = async (req, res) => {
//   try {
//     const me = req.user?._id;
//     const { conversationId } = req.params;

//     if (!me) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized",
//       });
//     }

//     if (!mongoose.Types.ObjectId.isValid(conversationId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid conversationId",
//       });
//     }

//     const access = await ensureParticipant(conversationId, me);
//     if (!access.ok) {
//       return res.status(access.status).json({
//         success: false,
//         message: access.message,
//       });
//     }

//     const page = Math.max(Number(req.query.page) || 1, 1);
//     const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
//     const skip = (page - 1) * limit;

//     const filter = {
//       conversationId,
//       isDeleted: false,
//     };

//     const [messages, total] = await Promise.all([
//       Message.find(filter)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .populate("sender", "fullname name username avatar")
//         .populate("receiver", "fullname name username avatar")
//         .populate("replyTo.message")
//         .populate("replyTo.sender", "name username avatar")
//         .lean(),
//       Message.countDocuments(filter),
//     ]);

//     // latest-first query -> frontend-friendly oldest-to-newest current page
//     const ordered = messages.reverse();

//     return res.status(200).json({
//       success: true,
//       message: "Messages fetched successfully",
//       data: ordered,
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//         hasMore: skip + messages.length < total,
//       },
//     });
//   } catch (e) {
//     return res.status(500).json({
//       success: false,
//       message: e.message || "Failed to fetch messages",
//     });
//   }
// };

export const getMessagesByConversation = async (req, res) => {
  try {
    const me = req.user?._id;
    const userRole = req.user?.role;
    const { conversationId } = req.params;

    if (!me) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversationId",
      });
    }

    // ====================================================================
    // 🔐 🎯 মেইন সিকিউরিটি ফিক্স: ensureParticipant এর বদলে ডাইনামিক চেক
    // ====================================================================
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found" });
    }

    const isOfficialMember = conversation.participants.some(
      (id) => String(id) === String(me),
    );

    const isAssignedModerator =
      userRole === "MODERATOR" &&
      conversation.assignedAgent &&
      String(conversation.assignedAgent) === String(me);

    // বায়ার, সেলার বা অ্যাসাইনড মডারেটর কোনোটিই না হলে চ্যাটের মেসেজ দেখতে দেবে না
    if (!isOfficialMember && !isAssignedModerator) {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: You do not have access to this conversation's messages",
      });
    }

    // ====================================================================

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {
      conversationId,
      isDeleted: false,
    };

    const [messages, total] = await Promise.all([
      Message.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "fullname name username avatar role") // মডারেটর চেনার জন্য role যুক্ত করা হলো
        .populate("receiver", "fullname name username avatar role")
        .populate("replyTo.message")
        .populate("replyTo.sender", "name username avatar")
        .lean(),
      Message.countDocuments(filter),
    ]);

    // latest-first query -> frontend-friendly oldest-to-newest current page
    const ordered = messages.reverse();

    return res.status(200).json({
      success: true,
      message: "Messages fetched successfully",
      data: ordered,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + messages.length < total,
      },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to fetch messages",
    });
  }
};

// send massage with user
// export const sendMessage = async (req, res) => {
//   try {
//     const me = req.user?._id;

//     const {
//       conversationId,
//       otherUserId,
//       text = "",
//       messageType = "text",
//       media = {},
//       mediaMeta = {},
//       replyTo = null,
//     } = req.body;

//     if (!me) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized",
//       });
//     }

//     // ✅ block check
//     const isBlocked = await Block.findOne({
//       $or: [
//         { blocker: me, blocked: otherUserId },
//         { blocker: otherUserId, blocked: me },
//       ],
//     });

//     if (isBlocked) {
//       return res.status(403).json({
//         success: false,
//         message: "You cannot send message to this user",
//       });
//     }

//     let conversation;
//     let receiverId;

//     // ===================== CASE A =====================
//     if (conversationId) {
//       conversation = await Conversation.findById(conversationId);

//       if (!conversation) {
//         return res.status(404).json({
//           success: false,
//           message: "Conversation not found",
//         });
//       }

//       const isMember = conversation.participants.some(
//         (id) => String(id) === String(me),
//       );

//       if (!isMember) {
//         return res.status(403).json({
//           success: false,
//           message: "Not allowed",
//         });
//       }

//       if (conversation.status !== "approved") {
//         return res.status(403).json({
//           success: false,
//           message: "Message request not accepted yet",
//         });
//       }

//       receiverId = conversation.participants.find(
//         (id) => String(id) !== String(me),
//       );
//     }

//     // ===================== CASE B =====================
//     if (!conversation) {
//       if (!otherUserId) {
//         return res.status(400).json({
//           success: false,
//           message: "otherUserId required",
//         });
//       }

//       const participants = [me, otherUserId]
//         .map((id) => new mongoose.Types.ObjectId(id))
//         .sort((a, b) => String(a).localeCompare(String(b)));

//       conversation = await Conversation.findOne({
//         participants: { $all: participants },
//         $expr: { $eq: [{ $size: "$participants" }, 2] },
//       });

//       if (!conversation) {
//         conversation = await Conversation.create({
//           participants,
//           status: "requested",
//           requestedBy: me,
//           lastMessage: "",
//           lastMessageType: "text",
//           lastMessageAt: new Date(),
//           unreadCount: 0,
//         });
//       }

//       if (conversation.status !== "approved") {
//         return res.status(403).json({
//           success: false,
//           message: "Message request pending",
//         });
//       }

//       receiverId = otherUserId;
//     }

//     // ================= MESSAGE CREATE =================
//     const msg = await Message.create({
//       conversationId: conversation._id,
//       sender: me,
//       receiver: receiverId,
//       text: messageType === "text" ? text : "",
//       messageType,
//       media,
//       mediaMeta,
//       seen: false,
//       delivered: false,
//       replyTo: replyTo
//         ? {
//             message: replyTo.message,
//             text: replyTo.text,
//             sender: replyTo.sender,
//           }
//         : null,
//     });

//     // ✅ update conversation
//     conversation.lastMessage =
//       messageType === "text"
//         ? text
//         : messageType === "image"
//           ? "📷 Image"
//           : "🎤 Voice";

//     conversation.lastMessageType = messageType;
//     conversation.lastMessageAt = new Date();

//     await conversation.save();

//     // ✅ populate sender receiver
//     const populatedMsg = await Message.findById(msg._id)
//       .populate("sender", "name username avatar")
//       .populate("receiver", "name username avatar");

//     return res.status(201).json({
//       success: true,
//       message: "Message sent",
//       data: populatedMsg,
//     });
//   } catch (e) {
//     console.log("❌ sendMessage error:", e);

//     return res.status(500).json({
//       success: false,
//       message: e.message || "Failed to send message",
//     });
//   }
// };

export const sendMessage = async (req, res) => {
  try {
    const me = req.user?._id;
    const userRole = req.user?.role;

    const {
      conversationId,
      otherUserId,
      text = "",
      messageType = "text",
      media = {},
      mediaMeta = {},
      replyTo = null,
    } = req.body;

    if (!me) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // ✅ block check
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: me, blocked: otherUserId },
        { blocker: otherUserId, blocked: me },
      ],
    });

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: "You cannot send message to this user",
      });
    }

    let conversation;
    let receiverId;

    // ===================== CASE A: conversationId দেওয়া থাকলে =====================
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      // 🔐 কাস্টম মেম্বার এবং মডারেটর সিকিউরিটি চেক
      const isOfficialMember = conversation.participants.some(
        (id) => String(id) === String(me),
      );

      const isAssignedModerator =
        userRole === "MODERATOR" &&
        conversation.assignedAgent &&
        String(conversation.assignedAgent) === String(me);

      // বায়ার, সেলার বা অ্যাসাইনড মডারেটর কোনোটিই না হলে ব্লক করবে
      if (!isOfficialMember && !isAssignedModerator) {
        return res.status(403).json({
          success: false,
          message:
            "Not allowed: You are not a participant or assigned agent of this chat",
        });
      }

      if (conversation.status !== "approved") {
        return res.status(403).json({
          success: false,
          message: "Message request not accepted yet",
        });
      }

      // 🎯 receiverId নির্ধারণ লজিক
      if (userRole === "MODERATOR") {
        // মডারেটর যদি মেসেজ পাঠায়, তবে receiver হবে কাস্টমার/বায়ার।
        // সেলারের আইডিটি (req.user.sellerId) বাদ দিয়ে বায়ারের আইডি খুঁজে বের করা হচ্ছে।
        const linkedSellerUserId = String(req.user.sellerId);
        receiverId = conversation.participants.find(
          (id) => String(id) !== linkedSellerUserId,
        );
      } else {
        // বায়ার বা সেলার মেসেজ পাঠালে আপনার ওল্ড লজিক অনুযায়ী অন্যজন receiver হবে
        receiverId = conversation.participants.find(
          (id) => String(id) !== String(me),
        );
      }
    }

    // ===================== CASE B: conversationId না থাকলে (Direct Message) =====================
    if (!conversation) {
      if (!otherUserId) {
        return res.status(400).json({
          success: false,
          message: "otherUserId required",
        });
      }

      const participants = [me, otherUserId]
        .map((id) => new mongoose.Types.ObjectId(id))
        .sort((a, b) => String(a).localeCompare(String(b)));

      conversation = await Conversation.findOne({
        participants: { $all: participants },
        $expr: { $eq: [{ $size: "$participants" }, 2] },
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants,
          status: "requested",
          requestedBy: me,
          lastMessage: "",
          lastMessageType: "text",
          lastMessageAt: new Date(),
          unreadCount: 0,
        });
      }

      if (conversation.status !== "approved") {
        return res.status(403).json({
          success: false,
          message: "Message request pending",
        });
      }

      receiverId = otherUserId;
    }

    // ================= MESSAGE CREATE (নিখুঁত ও ট্র্যাকেবল) =================
    const msg = await Message.create({
      conversationId: conversation._id,
      sender: me, // মডারেটর পাঠালে sender হবে মডারেটরের নিজের আইডি
      receiver: receiverId, // receiver হবে কাস্টমার বা ওনার
      text: messageType === "text" ? text : "",
      messageType,
      media,
      mediaMeta,
      seen: false,
      delivered: false,
      replyTo: replyTo
        ? {
            message: replyTo.message,
            text: replyTo.text,
            sender: replyTo.sender,
          }
        : null,
    });

    // ✅ update conversation preview
    conversation.lastMessage =
      messageType === "text"
        ? text
        : messageType === "image"
          ? "📷 Image"
          : "🎤 Voice";

    conversation.lastMessageType = messageType;
    conversation.lastMessageAt = new Date();

    await conversation.save();

    // ✅ populate sender receiver
    const populatedMsg = await Message.findById(msg._id)
      .populate("sender", "name username avatar role") // মডারেটর চেনার জন্য role পপুলেট করা হলো
      .populate("receiver", "name username avatar role");

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: populatedMsg,
    });
  } catch (e) {
    console.log("❌ sendMessage error:", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to send message",
    });
  }
};

// message edit
export const editMessage = async (req, res) => {
  try {
    const me = req.user?._id;
    const { messageId } = req.params;
    const { text } = req.body;

    if (!me) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    // ✅ only sender can edit
    if (String(message.sender) !== String(me)) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    // ❌ only text message editable
    if (message.messageType !== "text") {
      return res
        .status(400)
        .json({ success: false, message: "Only text messages can be edited" });
    }

    message.text = text;
    message.isEdited = true; // optional flag
    await message.save();

    const updated = await Message.findById(message._id)
      .populate("sender", "name username avatar")
      .populate("receiver", "name username avatar");

    return res.json({
      success: true,
      message: "Message updated",
      data: updated,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// /**
//  * PATCH /messages/seen/:conversationId
//  */
// export const markMessagesSeen = async (req, res) => {
//   try {
//     const me = req.user?._id;
//     const { conversationId } = req.params;

//     if (!me) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized",
//       });
//     }

//     if (!mongoose.Types.ObjectId.isValid(conversationId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid conversationId",
//       });
//     }

//     const access = await ensureParticipant(conversationId, me);
//     if (!access.ok) {
//       return res.status(access.status).json({
//         success: false,
//         message: access.message,
//       });
//     }

//     const unseenMessages = await Message.find({
//       conversationId,
//       receiver: me,
//       seen: false,
//       isDeleted: false,
//     }).select("_id");

//     const unseenIds = unseenMessages.map((m) => m._id);

//     if (unseenIds.length > 0) {
//       const now = new Date();

//       await Message.updateMany(
//         { _id: { $in: unseenIds } },
//         {
//           $set: {
//             seen: true,
//             delivered: true,
//             seenAt: now,
//             deliveredAt: now,
//           },
//         },
//       );
//     }

//     await Conversation.findByIdAndUpdate(conversationId, {
//       $set: { unreadCount: 0 },
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Messages marked as seen",
//       data: {
//         conversationId,
//         updatedCount: unseenIds.length,
//         messageIds: unseenIds,
//       },
//     });
//   } catch (e) {
//     return res.status(500).json({
//       success: false,
//       message: e.message || "Failed to mark messages as seen",
//     });
//   }
// };

export const markMessagesSeen = async (req, res) => {
  try {
    const me = req.user?._id;
    const userRole = req.user?.role;
    const { conversationId } = req.params;

    if (!me) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversationId",
      });
    }

    // ====================================================================
    // 🔐 🎯 ১. সিকিউরিটি চেক: মডারেটর বা অফিশিয়াল মেম্বার কিনা ভেরিফিকেশন
    // ====================================================================
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found" });
    }

    const isOfficialMember = conversation.participants.some(
      (id) => String(id) === String(me),
    );

    const isAssignedModerator =
      userRole === "MODERATOR" &&
      conversation.assignedAgent &&
      String(conversation.assignedAgent) === String(me);

    if (!isOfficialMember && !isAssignedModerator) {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: You cannot mark messages as seen for this conversation",
      });
    }

    // ====================================================================
    // 📩 🎯 ২. ডাইনামিক রিসিভার আইডি সেটআপ (মডারেটর ফিক্স)
    // ====================================================================
    let targetReceiverId = me;

    if (userRole === "MODERATOR") {
      // বায়ার যখন মেসেজ পাঠায়, সে সেলারকে receiver বানিয়ে পাঠায়।
      // তাই মডারেটর চ্যাটে ঢুকলে যেন বায়ারের পাঠানো মেসেজগুলো 'Seen' হয়ে যায়,
      // তার জন্য receiver হিসেবে সেলারের (মালিকের) ইউজার আইডি দিয়ে মেসেজ খুঁজতে হবে।
      targetReceiverId = new mongoose.Types.ObjectId(String(req.user.sellerId));
    }

    // বিপরীত পার্টির পাঠানো আনসিন মেসেজগুলো খুঁজে বের করা
    const unseenMessages = await Message.find({
      conversationId,
      receiver: targetReceiverId, // 🎯 ওনার আইডিতে সিঙ্ক করা হলো
      seen: false,
      isDeleted: false,
    }).select("_id");

    const unseenIds = unseenMessages.map((m) => m._id);

    if (unseenIds.length > 0) {
      const now = new Date();

      await Message.updateMany(
        { _id: { $in: unseenIds } },
        {
          $set: {
            seen: true,
            delivered: true,
            seenAt: now,
            deliveredAt: now,
          },
        },
      );
    }

    // গ্লোবাল আনরিড কাউন্ট ক্লিয়ার করা
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { unreadCount: 0 },
    });

    return res.status(200).json({
      success: true,
      message: "Messages marked as seen successfully",
      data: {
        conversationId,
        updatedCount: unseenIds.length,
        messageIds: unseenIds,
      },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to mark messages as seen",
    });
  }
};

// /**
//  * DELETE /messages/:messageId
//  * optional soft delete (only sender)
//  */
export const deleteMessage = async (req, res) => {
  try {
    const me = req.user?._id;
    const { messageId } = req.params;

    if (!me) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid messageId",
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // ✅ only sender can delete
    if (String(message.sender) !== String(me)) {
      return res.status(403).json({
        success: false,
        message: "Only sender can delete this message",
      });
    }

    // ✅ capture media info before delete
    const key = message?.media?.key;
    const provider = message?.media?.provider;

    // ✅ delete from wasabi
    if (key && String(provider).toLowerCase() === "wasabi") {
      try {
        await deleteFromWasabi(String(key));
      } catch (e) {
        console.log("❌ Wasabi delete failed:", e?.message);
      }
    }

    // ✅ HARD DELETE FROM DB
    await Message.findByIdAndDelete(messageId);

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully",
      data: {
        messageId,
      },
    });
  } catch (e) {
    console.log("❌ delete message error", e);

    return res.status(500).json({
      success: false,
      message: e.message || "Failed to delete message",
    });
  }
};

// my conversation users online list
export const getChatOnlineUnion = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const me = new mongoose.Types.ObjectId(userId);
    const meStr = String(userId);

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const q = String(req.query.q || "").trim();

    // -------------------------------
    // STEP 1: Get conversation users
    // -------------------------------
    const myConversations = await Conversation.find({
      participants: me,
    }).select("participants");

    const conversationUserIdsSet = new Set();

    myConversations.forEach((c) => {
      c.participants.forEach((p) => {
        const id = String(p);
        if (id !== meStr) {
          conversationUserIdsSet.add(id);
        }
      });
    });

    const conversationUserIds = Array.from(conversationUserIdsSet).map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    if (conversationUserIds.length === 0) {
      return res.json({
        success: true,
        items: [],
        nextCursor: null,
      });
    }

    const usersCollection = User.collection.name;

    // -------------------------------
    // STEP 2: Aggregation
    // -------------------------------
    const pipeline = [
      // only conversation users
      {
        $match: {
          _id: { $in: conversationUserIds },
        },
      },

      // join user details
      {
        $lookup: {
          from: usersCollection,
          localField: "_id",
          foreignField: "_id",
          as: "u",
        },
      },
      { $unwind: "$u" },

      // online filter
      {
        $match: {
          "u.isOnline": true,
        },
      },
    ];

    // search filter
    if (q) {
      pipeline.push({
        $match: {
          $or: [
            { "u.name": { $regex: q, $options: "i" } },
            { "u.username": { $regex: q, $options: "i" } },
          ],
        },
      });
    }

    pipeline.push(
      { $limit: limit },
      {
        $project: {
          userId: "$u._id",
          name: "$u.name",
          username: "$u.username",
          cover: "$u.cover",
          avatar: "$u.avatar",
          isOnline: "$u.isOnline",
          lastSeen: "$u.lastSeen",
        },
      },
    );

    const items = await Conversation.aggregate(pipeline);

    return res.json({
      success: true,
      items,
      nextCursor: null,
    });
  } catch (e) {
    console.log("❌ controller error:", e);
    return res.status(500).json({
      success: false,
      message: e?.message || "Chat online fetch failed",
    });
  }
};



// export const getChatOnlineUnion = async (req, res) => {
//   try {
//     const userId = req.user?._id;
//     if (!mongoose.isValidObjectId(userId)) {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }

//     const me = toOID(userId);
//     const meStr = String(userId);

//     // ✅ DEBUG: does follow relation exist?
//     const testCount = await Follow.countDocuments({
//       $or: [
//         { follower: me },
//         { following: me },
//         { follower: meStr },
//         { following: meStr },
//       ],
//     });
//     console.log("follow match count:", testCount);

//     const limit = Math.min(Number(req.query.limit) || 20, 50);
//     const q = String(req.query.q || "").trim();
//     const cursor = parseCursor(req.query.cursor);
//     const cursorFilter = buildRelCursorFilter(cursor);

//     const usersCollection = User.collection.name; // ✅ correct collection name

//     const pipeline = [
//       {
//         $match: {
//           $or: [
//             { follower: me },
//             { following: me },
//             { follower: meStr },
//             { following: meStr },
//           ],
//         },
//       },
//       {
//         $project: {
//           otherId: {
//             $cond: [{ $eq: ["$follower", me] }, "$following", "$follower"],
//           },
//           isFollowing: { $eq: ["$follower", me] },
//           isFollower: { $eq: ["$following", me] },
//           createdAt: 1,
//         },
//       },
//       {
//         $group: {
//           _id: "$otherId",
//           isFollowing: { $max: "$isFollowing" },
//           isFollower: { $max: "$isFollower" },
//           relAt: { $max: "$createdAt" },
//         },
//       },
//       ...(cursorFilter ? [{ $match: cursorFilter }] : []),

//       {
//         $lookup: {
//           from: usersCollection,
//           localField: "_id",
//           foreignField: "_id",
//           as: "u",
//         },
//       },
//       { $unwind: "$u" },

//       {
//         $lookup: {
//           from: "blocks",
//           let: { otherUserId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $or: [
//                     {
//                       $and: [
//                         { $eq: ["$blocker", me] },
//                         { $eq: ["$blocked", "$$otherUserId"] },
//                       ],
//                     },
//                     {
//                       $and: [
//                         { $eq: ["$blocker", "$$otherUserId"] },
//                         { $eq: ["$blocked", me] },
//                       ],
//                     },
//                   ],
//                 },
//               },
//             },
//           ],
//           as: "blockData",
//         },
//       },
//       {
//         $match: {
//           blockData: { $size: 0 }, // ❗ exclude blocked users
//         },
//       },

//       { $match: { "u.isOnline": true } },
//     ];

//     if (q) {
//       pipeline.push({
//         $match: {
//           $or: [
//             { "u.name": { $regex: q, $options: "i" } },
//             { "u.username": { $regex: q, $options: "i" } },
//           ],
//         },
//       });
//     }

//     pipeline.push(
//       { $sort: { relAt: -1, _id: -1 } },
//       { $limit: limit },
//       {
//         $addFields: {
//           relation: {
//             $cond: [
//               { $and: ["$isFollowing", "$isFollower"] },
//               "mutual",
//               { $cond: ["$isFollowing", "following", "follower"] },
//             ],
//           },
//         },
//       },
//       {
//         $project: {
//           userId: "$u._id",
//           name: "$u.name",
//           username: "$u.username",
//           cover: "$u.cover",
//           avatar: "$u.avatar",
//           isOnline: "$u.isOnline",
//           lastSeen: "$u.lastSeen",
//           isFollowing: 1,
//           isFollower: 1,
//           relation: 1,
//           relAt: 1,
//           otherId: "$_id",
//         },
//       },
//     );

//     const items = await Follow.aggregate(pipeline);

//     const nextCursor =
//       items.length > 0
//         ? {
//             relAt: items[items.length - 1].relAt,
//             otherId: items[items.length - 1].otherId,
//           }
//         : null;

//     const userList = items.map((x) => ({
//       _id: x.userId,
//       name: x.name,
//       username: x.username,
//       cover: x.cover,
//       avatar: x.avatar,
//       isOnline: x.isOnline,
//       lastSeen: x.lastSeen,
//       isFollowing: x.isFollowing,
//       isFollower: x.isFollower,
//       relation: x.relation,
//       relAt: x.relAt,
//     }));

//     return res.json({ success: true, items: userList, nextCursor });
//   } catch (e) {
//     console.log("❌ controller error:", e); // ✅ add this
//     return res.status(500).json({
//       success: false,
//       message: e?.message || "Chat online fetch failed",
//     });
//   }
// };

// ===================== Message Reaction =====================


export const handleMessageReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    const userId = req.user._id; // মিডলওয়্যার (Auth) থেকে আসা লগইন ইউজারের আইডি
    const { messageId } = req.params;
    console.log('emoji',emoji,messageId);
    

    // ১. ভ্যালিডেশন চেক
    if (!messageId || !emoji) {
      return res.status(400).json({
        success: false,
        message: "Message ID and emoji are required",
      });
    }

    // ২. আগের রিঅ্যাকশন থাকলে তা রিমুভ (Pull) করা
    await Message.updateOne(
      { _id: messageId },
      { $pull: { reactions: { user: userId } } },
    );

    // ৩. নতুন রিঅ্যাকশনটি পুশ (Push) করা এবং মেসেজ রিটার্ন করা
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      {
        $push: {
          reactions: { user: userId, emoji, createdAt: new Date() },
        },
      },
      { new: true },
    ).populate("reactions.user", "name avatar"); // ফ্রন্টএন্ডে ইউজারের নাম ও ছবি দেখানোর জন্য

    if (!updatedMessage) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // ৪. সফল রেসপন্স
    return res.status(200).json({
      success: true,
      message: "Reaction updated successfully",
      data: updatedMessage,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};