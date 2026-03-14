import mongoose from "mongoose";
import Conversation from "../../models/chat/conversation.model.js";
import Message from "../../models/chat/message.model.js";
import Follow from "../../models/follow/follow.model.js";
import User from "../../models/user/user.model.js";
import { deleteFromWasabi } from "../../services/wbUpload.service.js";

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

/**
 * GET /messages/:conversationId?page=1&limit=20
 */
export const getMessagesByConversation = async (req, res) => {
  try {
    const me = req.user?._id;
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

    const access = await ensureParticipant(conversationId, me);
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

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
        .populate("sender", "fullname name username profilePic")
        .populate("receiver", "fullname name username profilePic")
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

/**
 * POST /messages/send
 * body:
 * {
 *   conversationId,   // optional if otherUserId given
 *   otherUserId,      // optional if conversationId given
 *   text,
 *   messageType,      // text | image | voice
 *   media: {
 *     key,
 *     url,
 *     provider
 *   },
 *   mediaMeta: {
 *     duration,
 *     size,
 *     mimeType
 *   }
 * }
 */
export const sendMessage = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const me = req.user?._id;

    const {
      conversationId,
      otherUserId,
      text = "",
      messageType = "text",
      media = {},
      mediaMeta = {},
    } = req.body;

    if (!me) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!["text", "image", "voice"].includes(messageType)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Invalid messageType",
      });
    }

    if (messageType === "text" && !String(text).trim()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Text message cannot be empty",
      });
    }

    if (
      (messageType === "image" || messageType === "voice") &&
      !String(media?.url || "").trim()
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `${messageType} message requires media.url`,
      });
    }

    let conversation = null;
    let receiverId = null;

    /**
     * Case A: conversationId provided
     */
    if (conversationId) {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Invalid conversationId",
        });
      }

      conversation =
        await Conversation.findById(conversationId).session(session);

      if (!conversation) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      const isParticipant = conversation.participants.some(
        (id) => String(id) === String(me),
      );

      if (!isParticipant) {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({
          success: false,
          message: "You are not allowed to send in this conversation",
        });
      }

      const otherParticipant = conversation.participants.find(
        (id) => String(id) !== String(me),
      );

      if (!otherParticipant) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Invalid conversation participants",
        });
      }

      receiverId = otherParticipant;
    }

    /**
     * Case B: conversationId না থাকলে otherUserId দিয়ে conversation find/create
     */
    if (!conversation) {
      if (!otherUserId) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Either conversationId or otherUserId is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Invalid otherUserId",
        });
      }

      if (String(me) === String(otherUserId)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "You cannot send message to yourself",
        });
      }

      receiverId = otherUserId;

      conversation = await Conversation.findOne({
        participants: { $all: [me, otherUserId] },
        $expr: { $eq: [{ $size: "$participants" }, 2] },
      }).session(session);

      if (!conversation) {
        const created = await Conversation.create(
          [
            {
              participants: [me, otherUserId],
              lastMessage: "",
              lastMessageType: "text",
              lastMessageAt: new Date(),
              unreadCount: 0,
            },
          ],
          { session },
        );

        conversation = created[0];
      }
    }

    const createdMessages = await Message.create(
      [
        {
          conversationId: conversation._id,
          sender: me,
          receiver: receiverId,

          text: messageType === "text" ? String(text).trim() : "",

          messageType,

          media:
            messageType === "text"
              ? { key: "", url: "", provider: "" }
              : {
                  key: String(media?.key || "").trim(),
                  url: String(media?.url || "").trim(),
                  provider: String(media?.provider || "wasabi").trim(),
                },

          mediaMeta:
            messageType === "text"
              ? { duration: 0, size: 0, mimeType: "" }
              : {
                  duration: Number(mediaMeta?.duration) || 0,
                  size: Number(mediaMeta?.size) || 0,
                  mimeType: String(mediaMeta?.mimeType || "").trim(),
                },

          delivered: false,
          seen: false,
        },
      ],
      { session },
    );

    const message = createdMessages[0];

    conversation.lastMessage =
      messageType === "text"
        ? String(text).trim()
        : messageType === "image"
          ? "📷 Image"
          : "🎤 Voice";

    conversation.lastMessageType = messageType;
    conversation.lastMessageAt = message.createdAt;
    conversation.unreadCount = Number(conversation.unreadCount || 0) + 1;

    await conversation.save({ session });

    await session.commitTransaction();
    session.endSession();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "fullname name username profilePic")
      .populate("receiver", "fullname name username profilePic")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: {
        conversationId: conversation._id,
        message: populatedMessage,
      },
    });
  } catch (e) {
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      success: false,
      message: e.message || "Failed to send message",
    });
  }
};

/**
 * PATCH /messages/seen/:conversationId
 */
export const markMessagesSeen = async (req, res) => {
  try {
    const me = req.user?._id;
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

    const access = await ensureParticipant(conversationId, me);
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    const unseenMessages = await Message.find({
      conversationId,
      receiver: me,
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

    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { unreadCount: 0 },
    });

    return res.status(200).json({
      success: true,
      message: "Messages marked as seen",
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

/**
 * DELETE /messages/:messageId
 * optional soft delete (only sender)
 */
export const deleteMessage = async (req, res) => {
  try {
    const me = req.user?._id;
    const { messageId } = req.params;

    if (!me) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid messageId" });
    }

    const message = await Message.findById(messageId);

    if (!message || message.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    if (String(message.sender) !== String(me)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Only sender can delete this message",
        });
    }

    // ✅ capture media info before clearing
    const key = message?.media?.key;
    const provider = message?.media?.provider;
    // ✅ wasabi delete (best effort)
    if (
      !message.isDeleted &&
      key &&
      String(provider).toLowerCase() === "wasabi"
    ) {
      try {
        await deleteFromWasabi(String(key));
      } catch (e) {
        console.log("❌ Wasabi delete failed:", e?.message);
        // continue anyway
      }
    }

    // ✅ DB soft delete
    message.isDeleted = true;
    message.text = "";
    message.media = { key: "", url: "", provider: "" };
    await message.save();

    return res
      .status(200)
      .json({ success: true, message: "Message deleted successfully" });
  } catch (e) {
    return res
      .status(500)
      .json({
        success: false,
        message: e.message || "Failed to delete message",
      });
  }
};

// online member from followers and following
// export const getChatOnlineUnion = async (req, res) => {
//   try {
//     const userId = req.user?._id;

//     if (!mongoose.isValidObjectId(userId)) {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }
//     console.log('user id',userId);

//     const me = toOID(userId);
//     console.log('me',me);

//     const limit = Math.min(Number(req.query.limit) || 20, 50);
//     const q = String(req.query.q || "").trim();
//     const cursor = parseCursor(req.query.cursor);

//     // cursor shape: { relAt, otherId }
//     const cursorFilter = buildRelCursorFilter(cursor);
//     // ⚠️ buildRelCursorFilter should expect cursor.otherId not cursor._id (fix below)
//     console.log('cursor filter',cursorFilter);

//     const pipeline = [
//       {
//         $match: {
//           $or: [{ follower: me }, { following: me }],
//         },
//       },

//       // other userId + flags
//       {
//         $project: {
//           otherId: {
//             $cond: [{ $eq: ["$follower", me] }, "$following", "$follower"],
//           },
//           isFollowing: { $eq: ["$follower", me] }, // I follow them
//           isFollower: { $eq: ["$following", me] }, // they follow me
//           createdAt: 1,
//         },
//       },

//       // union by otherId
//       {
//         $group: {
//           _id: "$otherId", // ✅ keep otherId here
//           isFollowing: { $max: "$isFollowing" },
//           isFollower: { $max: "$isFollower" },
//           relAt: { $max: "$createdAt" },
//         },
//       },

//       // ✅ cursor paging here (relAt + otherId)
//       ...(cursorFilter ? [{ $match: cursorFilter }] : []),

//       // join users
//       {
//         $lookup: {
//           from: "users",
//           localField: "_id",
//           foreignField: "_id",
//           as: "u",
//         },
//       },
//       { $unwind: "$u" },

//       // ✅ online only
//       { $match: { "u.isOnline": true } },
//     ];

//     // optional search
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

//       // ✅ return clean user list + keep cursor fields separately
//       {
//         $project: {
//           userId: "$u._id",
//           name: "$u.name",
//           username: "$u.username",
//           avatarUrl: "$u.avatarUrl",
//           avatarKey: "$u.avatarKey",
//           provider: { $ifNull: ["$u.avatarProvider", "wasabi"] },
//           isOnline: "$u.isOnline",
//           lastSeen: "$u.lastSeen",

//           isFollowing: 1,
//           isFollower: 1,
//           relation: 1,

//           // cursor fields
//           relAt: 1,
//           otherId: "$_id",
//         },
//       },
//     );

//     const items = await Follow.aggregate(pipeline);
//     console.log('items',items);

//     const nextCursor =
//       items.length > 0
//         ? {
//             relAt: items[items.length - 1].relAt,
//             otherId: items[items.length - 1].otherId, // ✅ important
//           }
//         : null;

//     // ✅ return clean list
//     const userList = items.map((x) => ({
//       _id: x.userId,
//       name: x.name,
//       username: x.username,
//       avatarUrl: x.avatarUrl,
//       avatarKey: x.avatarKey,
//       provider: x.provider,
//       isOnline: x.isOnline,
//       lastSeen: x.lastSeen,
//       isFollowing: x.isFollowing,
//       isFollower: x.isFollower,
//       relation: x.relation,
//       relAt: x.relAt, // optional
//     }));

//     return res.json({ success: true, items: userList, nextCursor });
//   } catch (e) {
//     return res.status(500).json({
//       success: false,
//       message: e?.message || "Chat online fetch failed",
//     });
//   }
// };


export const getChatOnlineUnion = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const me = toOID(userId);
    const meStr = String(userId);

    // ✅ DEBUG: does follow relation exist?
    const testCount = await Follow.countDocuments({
      $or: [
        { follower: me },
        { following: me },
        { follower: meStr },
        { following: meStr },
      ],
    });
    console.log("follow match count:", testCount);

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const q = String(req.query.q || "").trim();
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildRelCursorFilter(cursor);

    const usersCollection = User.collection.name; // ✅ correct collection name

    const pipeline = [
      {
        $match: {
          $or: [
            { follower: me },
            { following: me },
            { follower: meStr },
            { following: meStr },
          ],
        },
      },
      {
        $project: {
          otherId: {
            $cond: [{ $eq: ["$follower", me] }, "$following", "$follower"],
          },
          isFollowing: { $eq: ["$follower", me] },
          isFollower: { $eq: ["$following", me] },
          createdAt: 1,
        },
      },
      {
        $group: {
          _id: "$otherId",
          isFollowing: { $max: "$isFollowing" },
          isFollower: { $max: "$isFollower" },
          relAt: { $max: "$createdAt" },
        },
      },
      ...(cursorFilter ? [{ $match: cursorFilter }] : []),

      {
        $lookup: {
          from: usersCollection,
          localField: "_id",
          foreignField: "_id",
          as: "u",
        },
      },
      { $unwind: "$u" },

      { $match: { "u.isOnline": true } },
    ];

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
      { $sort: { relAt: -1, _id: -1 } },
      { $limit: limit },
      {
        $addFields: {
          relation: {
            $cond: [
              { $and: ["$isFollowing", "$isFollower"] },
              "mutual",
              { $cond: ["$isFollowing", "following", "follower"] },
            ],
          },
        },
      },
      {
        $project: {
          userId: "$u._id",
          name: "$u.name",
          username: "$u.username",
          cover: "$u.cover",
          isOnline: "$u.isOnline",
          lastSeen: "$u.lastSeen",
          isFollowing: 1,
          isFollower: 1,
          relation: 1,
          relAt: 1,
          otherId: "$_id",
        },
      },
    );

    const items = await Follow.aggregate(pipeline);
 

    const nextCursor =
      items.length > 0
        ? {
            relAt: items[items.length - 1].relAt,
            otherId: items[items.length - 1].otherId,
          }
        : null;

    const userList = items.map((x) => ({
      _id: x.userId,
      name: x.name,
      username: x.username,
      cover: x.cover,
      isOnline: x.isOnline,
      lastSeen: x.lastSeen,
      isFollowing: x.isFollowing,
      isFollower: x.isFollower,
      relation: x.relation,
      relAt: x.relAt,
    }));

    return res.json({ success: true, items: userList, nextCursor });
  } catch (e) {
    console.log("❌ controller error:", e); // ✅ add this
    return res.status(500).json({
      success: false,
      message: e?.message || "Chat online fetch failed",
    });
  }
};
