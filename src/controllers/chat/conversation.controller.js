import mongoose from "mongoose";
import Conversation from "../../models/chat/conversation.model.js";
import Message from "../../models/chat/message.model.js";
import User from "../../models/user/user.model.js"; // আপনার পাথ দিন
import Seller from "../../models/ecommarce/Seller.model.js";

/**
 * POST /conversations/create-or-get
 * body: { otherUserId }
 */
// export const createOrGetConversation = async (req, res) => {
//   try {
//     const me = req.user?._id;
//     const { otherUserId,type } = req.body;
//     // console.log("otheruserid", otherUserId, type);
//     const typeSelect = type == "market" ? "market" : "general";

//     console.log("typeSelect", typeSelect);

//     if (!me) {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }

//     if (!otherUserId) {
//       return res
//         .status(400)
//         .json({ success: false, message: "otherUserId is required" });
//     }

//     if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid otherUserId" });
//     }

//     if (String(me) === String(otherUserId)) {
//       return res.status(400).json({
//         success: false,
//         message: "You cannot create a conversation with yourself",
//       });
//     }

//     // ✅ normalize as ObjectIds + sorted for stability
//     const otherOID = new mongoose.Types.ObjectId(String(otherUserId));

//     const participantsSorted = [String(me), String(otherOID)]
//       .sort()
//       .map((id) => new mongoose.Types.ObjectId(id));

//     // ✅ find existing 1-to-1 (exactly 2 participants)
//     let conversation = await Conversation.findOne({
//       participants: { $all: participantsSorted },
//       $expr: { $eq: [{ $size: "$participants" }, 2] },
//       type: typeSelect,
//     })
//       .populate(
//         "participants",
//         "fullname name username profilePic email isOnline lastSeen",
//       )
//       .populate("assignedAgent", "name email role")
//       .lean();

//     // ✅ create if not exists
//      if (!conversation) {
//        console.log(
//          `✅ [Chat Link]: No conversation found, initializing type: ${typeSelect}`,
//        );

//        let assignedAgentId = null;

//        // 🎯 ৩. ই-কমার্স চ্যাট হলে সেলারের একটিভ মডারেটরদের মধ্যে রাউন্ড-রবিন চালানো
//        if (typeSelect === "market") {
//          // প্রথমে otherUserId (যেটি সেলারের userId) দিয়ে তার আসল শপ প্রোফাইলটি খুঁজুন
//          const shopProfile = await Seller.findOne({
//            userId: otherOID,
//            isDeleted: false,
//          }).lean();

//          if (shopProfile) {
//            // ওই নির্দিষ্ট শপের আন্ডারে কতজন ACTIVE মডারেটর চাকরি করছেন তাদের খুঁজুন
//            const activeShopMods = await User.find({
//              role: "MODERATOR",
//              moderatorStatus: "active",
//              sellerId: shopProfile.userId, // আমাদের আগের ফিক্স অনুযায়ী মডারেটরের sellerId = ওনারের userId সেভ আছে
//            }).sort({ _id: 1 });

//            console.log(
//              `🔍 [Chat Assignment]: শপের নাম: ${shopProfile.shopName} | একটিভ স্টাফ: ${activeShopMods.length} জন`,
//            );

//            if (activeShopMods.length > 0) {
//              // এই সেলারের শেষ কোন ই-কমার্স চ্যাটে মডারেটর অ্যাসাইন করা হয়েছিল তা দেখা
//              const lastAssignedChat = await Conversation.findOne({
//                type: "market",
//                participants: otherOID, // এই সেলারের যেকোনো চ্যাট
//                assignedAgent: { $ne: null },
//              }).sort({ createdAt: -1 });

//              if (!lastAssignedChat || !lastAssignedChat.assignedAgent) {
//                // প্রথম চ্যাট হলে প্রথম মডারেটর পাবে
//                assignedAgentId = activeShopMods[0]._id;
//              } else {
//                // শেষ কোন স্টাফ চ্যাট পেয়েছিল তার ইনডেক্স বের করে তার পরেরজনকে দেওয়া
//                const lastAgentId = lastAssignedChat.assignedAgent.toString();
//                const lastIndex = activeShopMods.findIndex(
//                  (mod) => mod._id.toString() === lastAgentId,
//                );

//                if (lastIndex === -1) {
//                  assignedAgentId = activeShopMods[0]._id;
//                } else {
//                  const nextIndex = (lastIndex + 1) % activeShopMods.length;
//                  assignedAgentId = activeShopMods[nextIndex]._id;
//                }
//              }
//            }
//          }
//        }

//        console.log(
//          "🎯 [Chat Assignment Live]: ফাইনাল অ্যাসাইন করা মডারেটর আইডি:",
//          assignedAgentId,
//        );

//        let created;
//        try {
//          created = await Conversation.create({
//            participants: participantsSorted,
//            lastMessage: "",
//            lastMessageType: "text",
//            lastMessageAt: new Date(),
//            unreadCount: 0,
//            status: "requested", // 🔥 add
//            requestedBy: me, // 🔥 add
//            type: typeSelect,
//            assignedAgent: assignedAgentId,
//          });
//          console.log("✅ created id:", created?._id);
//        } catch (err) {
//          console.log("❌ Conversation.create error:", err);
//          return res.status(500).json({
//            success: false,
//            message: err?.message || "Conversation create failed",
//          });
//        }

//        conversation = await Conversation.findById(created._id)
//          .populate(
//            "participants",
//            "fullname name username profilePic email isOnline lastSeen",
//          )
//          .populate("assignedAgent", "name email role")
//          .lean();

//        // console.log("✅ fetched conversation:", conversation?._id);
//      }

//     // console.log('conversation',conversation);

//     return res.status(200).json({
//       success: true,
//       message: "Conversation fetched successfully",
//       data: conversation,
//     });
//   } catch (e) {
//     return res.status(500).json({
//       success: false,
//       message: e?.message || "Failed to create or get conversation",
//     });
//   }
// };

export const createOrGetConversation = async (req, res) => {
  try {
    const me = req.user?._id;
    const { otherUserId, type } = req.body;

    // টাইপ ডাইনামিক করা হলো (ই-কমার্সের জন্য 'market' এবং সাধারণ চ্যাটের জন্য 'general')
    const typeSelect = type === "market" ? "market" : "general";

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

    const otherOID = new mongoose.Types.ObjectId(String(otherUserId));

    const participantsSorted = [String(me), String(otherOID)]
      .sort()
      .map((id) => new mongoose.Types.ObjectId(id));

    // ✅ ১. আগে থেকে ১-টু-১ চ্যাট রুম আছে কিনা চেক (মেম্বার সবসময় ২ জনই থাকবে)
    let conversation = await Conversation.findOne({
      participants: { $all: participantsSorted },
      $expr: { $eq: [{ $size: "$participants" }, 2] },
      type: typeSelect,
    })
      .populate(
        "participants",
        "fullname name username profilePic email isOnline lastSeen",
      )
      .populate("assignedAgent", "name email role") // অ্যাসাইন করা মডারেটরের তথ্যও পপুলেট করা হলো
      .lean();

    // ✅ ২. চ্যাট রুম না থাকলে নতুন তৈরি হবে এবং মডারেটর রাউন্ড-রবিন কাজ করবে
    if (!conversation) {
      console.log(
        `✅ [Chat Link]: No conversation found, initializing type: ${typeSelect}`,
      );

      let assignedAgentId = null;

      // 🎯 ৩. ই-কমার্স চ্যাট হলে সেলারের একটিভ মডারেটরদের মধ্যে রাউন্ড-রবিন চালানো
      if (typeSelect === "market") {
        // প্রথমে otherUserId (যেটি সেলারের userId) দিয়ে তার আসল শপ প্রোফাইলটি খুঁজুন
        const shopProfile = await Seller.findOne({
          userId: otherOID,
          isDeleted: false,
        }).lean();

      

        if (shopProfile) {
          // ওই নির্দিষ্ট শপের আন্ডারে কতজন ACTIVE মডারেটর চাকরি করছেন তাদের খুঁজুন
          const activeShopMods = await User.find({
            role: "MODERATOR",
            moderatorStatus: "active",
            sellerId: shopProfile.userId, // আমাদের আগের ফিক্স অনুযায়ী মডারেটরের sellerId = ওনারের userId সেভ আছে
          }).sort({ _id: 1 });

          console.log(
            `🔍 [Chat Assignment]: শপের নাম: ${shopProfile.shopName} | একটিভ স্টাফ: ${activeShopMods.length} জন`,
          );

          if (activeShopMods.length > 0) {
            // এই সেলারের শেষ কোন ই-কমার্স চ্যাটে মডারেটর অ্যাসাইন করা হয়েছিল তা দেখা
            const lastAssignedChat = await Conversation.findOne({
              type: "market",
              participants: otherOID, // এই সেলারের যেকোনো চ্যাট
              assignedAgent: { $ne: null },
            }).sort({ createdAt: -1 });

            if (!lastAssignedChat || !lastAssignedChat.assignedAgent) {
              // প্রথম চ্যাট হলে প্রথম মডারেটর পাবে
              assignedAgentId = activeShopMods[0]._id;
            } else {
              // শেষ কোন স্টাফ চ্যাট পেয়েছিল তার ইনডেক্স বের করে তার পরেরজনকে দেওয়া
              const lastAgentId = lastAssignedChat.assignedAgent.toString();
              const lastIndex = activeShopMods.findIndex(
                (mod) => mod._id.toString() === lastAgentId,
              );

              if (lastIndex === -1) {
                assignedAgentId = activeShopMods[0]._id;
              } else {
                const nextIndex = (lastIndex + 1) % activeShopMods.length;
                assignedAgentId = activeShopMods[nextIndex]._id;
              }
            }
          }
        }
      }

      console.log(
        "🎯 [Chat Assignment Live]: ফাইনাল অ্যাসাইন করা মডারেটর আইডি:",
        assignedAgentId,
      );

      // ৪. নতুন চ্যাট রুম তৈরি (মেম্বার ২ জনই থাকবে, তাই pre-save হুক এরর দিবে না)
      let created;
      try {
        created = await Conversation.create({
          participants: participantsSorted,
          lastMessage: "",
          lastMessageType: "text",
          lastMessageAt: new Date(),
          unreadCount: 0,
          status: typeSelect === "market" ? "approved" : "requested",
          requestedBy: me,
          type: typeSelect,
          assignedAgent: assignedAgentId, // 🎯 মডারেটর আইডিটি এখানে লক হয়ে গেল
        });
        console.log("✅ Conversation Created ID:", created?._id);
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
        .populate("assignedAgent", "name email role")
        .lean();
    }

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
     const userRole = req.user?.role;
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
        "fullname name username cover email isOnline lastSeen avatar",
      )
      .populate("assignedAgent", "name email role")
      .lean();

    if (!conv) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found" });
    }

     const isOfficialMember = Array.isArray(conv.participants)
       ? conv.participants.some((p) => String(p?._id) === String(me))
       : false;

     // ইউজার যদি মডারেটর হয়, তবে সে মেম্বার না হলেও এই চ্যাটের assignedAgent কি না তা চেক করবে
     const isAssignedModerator =
       userRole === "MODERATOR" &&
       conv.assignedAgent &&
       String(conv.assignedAgent._id || conv.assignedAgent) === String(me);

     // দুই কন্ডিশনের একটিও যদি সত্য না হয়, তবেই কেবল ব্লক করবে
     if (!isOfficialMember && !isAssignedModerator) {
       return res.status(403).json({
         success: false,
         message: "Forbidden: Access denied to this conversation",
       });
     }

     // ====================================================================
     // 👤 🎯 মেইন ডেরিভেশন ফিক্স: otherUser কে হবে তা নির্ধারণ
     // ====================================================================
     let otherUser = null;

     if (userRole === "MODERATOR") {
       // 🚀 মডারেটর যদি লগইন করে চ্যাট খোলে, তবে তার জন্য 'otherUser' হবে কাস্টমার/বায়ার।
       // যেহেতু participants অ্যারেতে শুধু বায়ার আর সেলার আছে, মডারেটর তার নিজের মালিকের (Seller) আইডিটি বাদ দিয়ে বায়ারের প্রোফাইলটি খুঁজে নেবে।
       const linkedSellerUserId = String(req.user.sellerId); // মডারেটরের মালিকের ইউজার আইডি

       otherUser = conv.participants.find(
         (p) => String(p?._id) !== linkedSellerUserId,
       );
     } else {
       // বায়ার বা সেলার লগইন করলে আপনার ওল্ড লজিক অনুযায়ী অন্যজনকে খুঁজে নেবে
       otherUser = conv.participants.find((p) => String(p?._id) !== String(me));
     }

    return res.status(200).json({
      success: true,
      message: "Conversation fetched",
      data: {
        _id: conv._id,
        lastMessage: conv.lastMessage,
        lastMessageType: conv.lastMessageType,
        lastMessageAt: conv.lastMessageAt,
        participants: conv.participants,
        assignedAgent: conv.assignedAgent,
        otherUser, // ✅ RN header/avatar use করবে
        type: conv.type,
        status: conv.status,
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
// export const getMyConversations = async (req, res) => {
//   try {
//     const me = req.user?._id;

//     if (!me) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized",
//       });
//     }

//     const page = Math.max(Number(req.query.page) || 1, 1);
//     const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
//     const skip = (page - 1) * limit;

//     const filter = { participants: me };

//     const [conversations, total] = await Promise.all([
//       Conversation.find(filter)
//         .populate(
//           "participants",
//           "name username cover email isOnline lastSeen avatar",
//         )
//         .sort({ lastMessageAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       Conversation.countDocuments(filter),
//     ]);

//     /**
//      * Optional: enrich each conversation with unseen count for current user
//      * This is more accurate than a single global unreadCount
//      */
//     const conversationIds = conversations.map((c) => c._id);

//     const unreadAgg = await Message.aggregate([
//       {
//         $match: {
//           conversationId: { $in: conversationIds },
//           receiver: new mongoose.Types.ObjectId(String(me)),
//           seen: false,
//           isDeleted: false,
//         },
//       },
//       {
//         $group: {
//           _id: "$conversationId",
//           count: { $sum: 1 },
//         },
//       },
//     ]);

//     const unreadMap = unreadAgg.reduce((acc, item) => {
//       acc[String(item._id)] = item.count;
//       return acc;
//     }, {});

//     const data = conversations.map((conv) => ({
//       ...conv,
//       myUnreadCount: unreadMap[String(conv._id)] || 0,
//     }));

//     return res.status(200).json({
//       success: true,
//       message: "Conversations fetched successfully",
//       data,
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//         hasMore: skip + data.length < total,
//       },
//     });
//   } catch (e) {
//     return res.status(500).json({
//       success: false,
//       message: e.message || "Failed to fetch conversations",
//     });
//   }
// };

export const getMyConversations = async (req, res) => {
  try {
    const me = req.user?._id;
    const userRole = req.user?.role;

    if (!me) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    // ====================================================================
    // 🔐 🎯 মেইন ফিল্টার ফিক্স: রোল অনুযায়ী ইনবক্সের কোয়েরি নির্ধারণ
    // ====================================================================
    let filter = { participants: me }; // ডিফল্ট বায়ার এবং সেলারের জন্য ওল্ড লজিক
    let unreadReceiverId = me; // আনরিড মেসেজ কার নামে খুঁজবে

    if (userRole === "MODERATOR") {
      if (req.user.moderatorStatus === "inactive" || !req.user.sellerId) {
        return res
          .status(403)
          .json({
            success: false,
            message: "Inactive or unlinked moderator account.",
          });
      }

      // 🚀 মডারেটর শুধু সেই ই-কমার্স চ্যাটগুলো দেখবে যেখানে সে নিজে assignedAgent হিসেবে লকড আছে
      filter = {
        type: "market",
        assignedAgent: me,
      };

      // 💡 মডারেটরের জন্য আনরিড মেসেজ কাউন্টের ট্রিক:
      // বায়ার যখন মেসেজ পাঠায়, সে সেলারকে receiver বানিয়ে পাঠায় (মডারেটরের আইডি সে জানে না)।
      // তাই মডারেটরের ইনবক্সে সঠিক আনরিড কাউন্ট দেখাতে হলে আমাদের সেলারের (দোকানের মালিকের) ইউজার আইডি দিয়ে মেসেজ চেক করতে হবে।
      unreadReceiverId = new mongoose.Types.ObjectId(String(req.user.sellerId));
    }

    // কনভারসেশন এবং টোটাল কাউন্ট ফেচ করা
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

    const conversationIds = conversations.map((c) => c._id);

    // ====================================================================
    // 📩 🎯 আনরিড মেসেজ এগ্রিগেশন ফিক্স (মডারেটরের ওনারের আইডি সিঙ্ক)
    // ====================================================================
    const unreadAgg = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: conversationIds },
          receiver: new mongoose.Types.ObjectId(String(unreadReceiverId)), // 🎯 ওনার আইডিতে সিঙ্ক হলো
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

    // ডাটা ম্যাপ ও রেসপন্স ফরম্যাটিং
    const data = conversations.map((conv) => {
      // 👤 রিয়্যাক্ট নেটিভের হেডার ও চ্যাট লিস্টের জন্য 'otherUser' ডেরিভেশন (যেমন getWithId তে বানালাম)
      let otherUser = null;
      if (userRole === "MODERATOR") {
        const linkedSellerUserId = String(req.user.sellerId);
        otherUser = conv.participants?.find(
          (p) => String(p?._id) !== linkedSellerUserId,
        );
      } else {
        otherUser = conv.participants?.find(
          (p) => String(p?._id) !== String(me),
        );
      }

      return {
        ...conv,
        otherUser, // 👈 এটি থাকলে রিয়্যাক্ট নেটিভের ইনবক্স লিস্টে কাস্টমারের নাম-ছবি অটো রিড হবে
        myUnreadCount: unreadMap[String(conv._id)] || 0,
      };
    });

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


export const getTotalUnseenCount = async (req, res) => {
  // console.log("req");
  try {
    const me = req.user?._id;

    if (!me) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // মেসেজ মডেলে যেখানে রিসিভার আমি এবং সিন হয়নি
    const totalUnseen = await Message.countDocuments({
      receiver: new mongoose.Types.ObjectId(String(me)),
      seen: false,
      isDeleted: false,
    });
    // console.log("totalUnseen", totalUnseen);

    return res.status(200).json({
      success: true,
      totalUnseen,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};


export const acceptConversationRequest = async (req, res) => {
  console.log('click');
  
  try {
    const me = req.user?._id;
    const { conversationId } = req.params;
    const status=req.query.status

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (String(me) === String(conversation.requestedBy)) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid action" });
    }
    if (status == "approved") {
      conversation.status = "approved";
    }else{
      conversation.status = "rejected";
    }
    
    await conversation.save();

    return res.json({
      success: true,
      message: `Conversation ${status}`,
      data: conversation,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};


// DELETE /conversations/reject/:id
export const rejectRequest = async (req, res) => {
  try {
    const me = req.user?._id;
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (String(me) === String(conversation.requestedBy)) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid action" });
    }

    conversation.status = "rejected";
    await conversation.save();

    return res.json({
      success: true,
      message: "Conversation accepted",
      data: conversation,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const checkConversationExists = async (req, res) => {
  try {
    const me = req.user?._id;
    const { otherUserId } = req.params; // বা req.query বা req.body থেকে নিতে পারেন
    

    if (!me || !otherUserId) {
      return res.status(400).json({ success: false, message: "ID missing" });
    }

    // ১-টু-১ কনভারসেশন চেক করা
    const conversation = await Conversation.findOne({
      participants: {
        $all: [
          new mongoose.Types.ObjectId(String(me)),
          new mongoose.Types.ObjectId(String(otherUserId)),
        ],
        $size: 2,
      },
    }).lean();
    

    if (conversation) {
      return res.status(200).json({
        success: true,
        exists: true,
        message: "Conversation already exists",
        conversationId: conversation._id,
      });
    } else {
      return res.status(200).json({
        success: true,
        exists: false,
        message: "No conversation found",
      });
    }
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message || "Internal server error",
    });
  }
};




// admin and user support conversation creation
export const createOrGetAdminSupportConversation = async (req, res) => {
  console.log("clicked")
  try {
    const me = req.user?._id; // যে কাস্টমার চ্যাট শুরু করছে (Buyer/User)

    if (!me) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ১. ডাটাবেজ থেকে মেইন ADMIN বা SUPPER ADMIN-এর আইডি খুঁজে বের করা
    const mainAdmin = await User.findOne({ role: "ADMIN" });
    if (!mainAdmin) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Main Admin account not found in system",
        });
    }
    const adminId = mainAdmin._id;

    // যদি কোনোভাবে অ্যাডমিন নিজেই নিজের সাপোর্টে ক্লিক করে ফেলে
    if (String(me) === String(adminId)) {
      return res.status(400).json({
        success: false,
        message: "Admin cannot create a support conversation with themselves",
      });
    }

    const participantsSorted = [String(me), String(adminId)]
      .sort()
      .map((id) => new mongoose.Types.ObjectId(id));

    // ২. চেক করা—এই কাস্টমার ও অ্যাডমিনের মধ্যে অলরেডি কোনো সাপোর্ট চ্যাট রুম আছে কিনা
    let conversation = await Conversation.findOne({
      participants: { $all: participantsSorted },
      type: "support", 
    })
      .populate(
        "participants",
        "fullname name username profilePic email isOnline lastSeen",
      )
      .populate("assignedAgent", "name email role") // অ্যাসাইন করা এজেন্ট (অ্যাডমিন/মডারেটর) পровать
      .lean();

      

    // ৩. যদি আগে কোনো চ্যাট রুম না থাকে, তবে নতুন তৈরি হবে এবং মডারেটর অ্যাসাইন হবে
    if (!conversation) {
      console.log(
        "✅ No support conversation found, creating and assigning agent...",
      );

      let assignedAgentId = adminId; // ডিফল্টভাবে মেইন অ্যাডমিন অ্যাসাইন থাকবে

      // 🔄 রাউন্ড-রবিন নিয়মে একজন অ্যাক্টিভ মডারেটর খুঁজে বের করা
      const activeModerators = await User.find({
        role: "MODERATOR",
        moderatorStatus: "active",
      }).sort({ _id: 1 });

      if (activeModerators.length > 0) {
        // শেষ কোন সাপোর্ট কনভারসেশনে মডারেটর অ্যাসাইন করা হয়েছিল তা দেখা
        const lastAssignedChat = await Conversation.findOne({
          type: "support",
          assignedAgent: { $ne: null },
        }).sort({ createdAt: -1 });

        if (!lastAssignedChat) {
          // প্রথম চ্যাট হলে প্রথম মডারেটর পাবে
          assignedAgentId = activeModerators[0]._id;
        } else {
          // শেষ মডারেটরের পরের মডারেটরকে চ্যাটটি দেওয়া
          const lastAgentId = lastAssignedChat.assignedAgent.toString();
          const lastIndex = activeModerators.findIndex(
            (mod) => mod._id.toString() === lastAgentId,
          );
          const nextIndex = (lastIndex + 1) % activeModerators.length;
          assignedAgentId = activeModerators[nextIndex]._id;
        }
      }

      // ৪. নতুন চ্যাট রুম তৈরি
      let created = await Conversation.create({
        participants: participantsSorted,
        lastMessage: "Support session started",
        lastMessageType: "text",
        lastMessageAt: new Date(),
        unreadCount: 0,
        status: "approved", // 👈 সাপোর্ট চ্যাট স্বয়ংক্রিয়ভাবে APPROVED হবে
        type: "support", // 👈 টাইপ ফিক্সড 'support'
        assignedAgent: assignedAgentId, // 👈 এই মডারেটর বা অ্যাডমিন চ্যাটটি রিপ্লাই দিতে পারবে
      });
      console.log("created conversation:", created);

      conversation = await Conversation.findById(created._id)
        .populate(
          "participants",
          "fullname name username profilePic email isOnline lastSeen",
        )
        .populate("assignedAgent", "name email role")
        .lean();
    }

    return res.status(200).json({
      success: true,
      message: "Support conversation loaded successfully",
      data: conversation,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Failed to create support conversation",
    });
  }
};
