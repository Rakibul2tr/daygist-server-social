import mongoose from "mongoose";
import Conversation from "../../models/chat/conversation.model.js";
import Message from "../../models/chat/message.model.js";


/**
 * POST /conversations/create-or-get
 * body: { otherUserId }
 */
export const createOrGetConversation = async (req, res) => {
  try {
    const me = req.user?._id;
    const { otherUserId } = req.body;
    // console.log('otheruserid',otherUserId,me);
    

    if (!me) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!otherUserId) {
      return res
        .status(400)
        .json({ success: false, message: "otherUserId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid otherUserId" });
    }

    if (String(me) === String(otherUserId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot create a conversation with yourself",
      });
    }

    // ✅ normalize as ObjectIds + sorted for stability
    const otherOID = new mongoose.Types.ObjectId(String(otherUserId));

    const participantsSorted = [String(me), String(otherOID)]
      .sort()
      .map((id) => new mongoose.Types.ObjectId(id));

    // ✅ find existing 1-to-1 (exactly 2 participants)
    let conversation = await Conversation.findOne({
      participants: { $all: participantsSorted },
      $expr: { $eq: [{ $size: "$participants" }, 2] },
    })
      .populate(
        "participants",
        "fullname name username profilePic email isOnline lastSeen",
      )
      .lean();

    // ✅ create if not exists
    if (!conversation) {
      console.log("✅ no conversation found, creating...");

      let created;
      try {
        created = await Conversation.create({
          participants: participantsSorted,
          lastMessage: "",
          lastMessageType: "text",
          lastMessageAt: new Date(),
          unreadCount: 0,
        });
        console.log("✅ created id:", created?._id);
      } catch (err) {
        console.log("❌ Conversation.create error:", err);
        return res.status(500).json({
          success: false,
          message: err?.message || "Conversation create failed",
        });
      }

      conversation = await Conversation.findById(created._id)
        .populate(
          "participants",
          "fullname name username profilePic email isOnline lastSeen",
        )
        .lean();

      console.log("✅ fetched conversation:", conversation?._id);
    }

    // console.log('conversation',conversation);
    
    return res.status(200).json({
      success: true,
      message: "Conversation fetched successfully",
      data: conversation,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Failed to create or get conversation",
    });
  }
};

export const getConversationById = async (req, res) => {
  try {
    const me = req.user?._id;
    const { conversationId } = req.params;

    if (!me) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid conversationId" });
    }

    const conv = await Conversation.findById(conversationId)
      .populate(
        "participants",
        "fullname name username cover email isOnline lastSeen profilePic",
      )
      .lean();

    if (!conv) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found" });
    }

    // ✅ security: only participants can access
    const isMember = Array.isArray(conv.participants)
      ? conv.participants.some((p) => String(p?._id) === String(me))
      : false;

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    // ✅ derive other user
    const otherUser = conv.participants.find(
      (p) => String(p?._id) !== String(me),
    );

    return res.status(200).json({
      success: true,
      message: "Conversation fetched",
      data: {
        _id: conv._id,
        lastMessage: conv.lastMessage,
        lastMessageType: conv.lastMessageType,
        lastMessageAt: conv.lastMessageAt,
        participants: conv.participants,
        otherUser, // ✅ RN header/avatar use করবে
      },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Failed to fetch conversation",
    });
  }
};

/**
 * GET /conversations/my
 * query: ?page=1&limit=20
 */
export const getMyConversations = async (req, res) => {
  try {
    const me = req.user?._id;

    if (!me) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = { participants: me };

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .populate(
          "participants",
          "name username cover email isOnline lastSeen avatar",
        )
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(filter),
    ]);

    /**
     * Optional: enrich each conversation with unseen count for current user
     * This is more accurate than a single global unreadCount
     */
    const conversationIds = conversations.map((c) => c._id);

    const unreadAgg = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: conversationIds },
          receiver: new mongoose.Types.ObjectId(String(me)),
          seen: false,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$conversationId",
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadMap = unreadAgg.reduce((acc, item) => {
      acc[String(item._id)] = item.count;
      return acc;
    }, {});

    const data = conversations.map((conv) => ({
      ...conv,
      myUnreadCount: unreadMap[String(conv._id)] || 0,
    }));

    return res.status(200).json({
      success: true,
      message: "Conversations fetched successfully",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + data.length < total,
      },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to fetch conversations",
    });
  }
};
