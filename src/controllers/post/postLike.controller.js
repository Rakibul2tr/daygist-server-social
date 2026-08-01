

// import mongoose from "mongoose";
// import Post from "../../models/post/post.model.js";
// import PostLike from "../../models/post/postLike.model.js";

// import GroupPost from "../../models/group/groupPost.model.js";
// import GroupPostLike from "../../models/group/groupPostLike.model.js";

// const isValidType = (t) => t === "post" || t === "groupPost";

// export const likePost = async (req, res) => {
//   try {
//     const me = req.user?._id;
//     const id = String(req.params.postId || "");
//     const type = String(req.query.type || "post"); // post | groupPost
//     // console.log("type", req.query.type);
    

//     if (!me) return res.status(401).json({ message: "Unauthorized" });
//     if (!mongoose.isValidObjectId(id))
//       return res.status(400).json({ message: "Invalid id" });
//     if (!isValidType(type))
//       return res.status(400).json({ message: "Invalid type" });

//     // ✅ GROUP POST
//     if (type === "groupPost") {
//       const post = await GroupPost.findOne({
//         _id: id,
//         isDeleted: { $ne: true },
//       })
//         .select("_id counts.likeCount")
//         .lean();
//         // console.log('post',post);
        
//       if (!post) return res.status(404).json({ message: "Post not found" });

//       const r = await GroupPostLike.updateOne(
//         { postId: id, userId: me },
//         { $setOnInsert: { postId: id, userId: me } },
//         { upsert: true },
//       );

//       let nextLikeCount = Number(post?.counts?.likeCount || 0);
//       if (r?.upsertedCount === 1) {
//         const up = await GroupPost.findByIdAndUpdate(
//           id,
//           { $inc: { "counts.likeCount": 1 } },
//           { new: true, select: "counts.likeCount" },
//         ).lean();
//         nextLikeCount = Number(up?.counts?.likeCount || nextLikeCount + 1);
//       }

//       return res.json({
//         success: true,
//         message: "Liked",
//         data: { id, type, isLiked: true, likeCount: nextLikeCount },
//       });
//     }

//     // ✅ NORMAL POST
//     const post = await Post.findOne({ _id: id, isDeleted: false })
//       .select("_id likeCount")
//       .lean();
//     if (!post) return res.status(404).json({ message: "Post not found" });

//     const r = await PostLike.updateOne(
//       { post: id, user: me },
//       { $setOnInsert: { post: id, user: me } },
//       { upsert: true },
//     );

//     let nextLikeCount = Number(post?.likeCount || 0);
//     if (r?.upsertedCount === 1) {
//       const up = await Post.findByIdAndUpdate(
//         id,
//         { $inc: { likeCount: 1 } },
//         { new: true, select: "likeCount" },
//       ).lean();
//       nextLikeCount = Number(up?.likeCount || nextLikeCount + 1);
//     }

//     return res.json({
//       success: true,
//       message: "Liked",
//       data: { id, type, isLiked: true, likeCount: nextLikeCount },
//     });
//   } catch (e) {
//     return res.status(500).json({ message: e?.message || "Like failed" });
//   }
// };

// export const unlikePost = async (req, res) => {
//   try {
//     const me = req.user?._id;
//     const id = String(req.params.postId || "");
//     const type = String(req.query.type || "post");

//     if (!me) return res.status(401).json({ message: "Unauthorized" });
//     if (!mongoose.isValidObjectId(id))
//       return res.status(400).json({ message: "Invalid id" });
//     if (!isValidType(type))
//       return res.status(400).json({ message: "Invalid type" });

//     // ✅ GROUP POST
//     if (type === "groupPost") {
//       const del = await GroupPostLike.deleteOne({ postId: id, userId: me });

//       let nextLikeCount = null;
//       if (del?.deletedCount) {
//         const up = await GroupPost.findByIdAndUpdate(
//           id,
//           { $inc: { "counts.likeCount": -1 } },
//           { new: true, select: "counts.likeCount" },
//         ).lean();
//         nextLikeCount = Number(up?.counts?.likeCount || 0);
//       }

//       return res.json({
//         success: true,
//         message: "Unliked",
//         data: { id, type, isLiked: false, likeCount: nextLikeCount },
//       });
//     }

//     // ✅ NORMAL POST
//     const del = await PostLike.deleteOne({ post: id, user: me });

//     let nextLikeCount = null;
//     if (del?.deletedCount) {
//       const up = await Post.findByIdAndUpdate(
//         id,
//         { $inc: { likeCount: -1 } },
//         { new: true, select: "likeCount" },
//       ).lean();
//       nextLikeCount = Number(up?.likeCount || 0);
//     }

//     return res.json({
//       success: true,
//       message: "Unliked",
//       data: { id, type, isLiked: false, likeCount: nextLikeCount },
//     });
//   } catch (e) {
//     return res.status(500).json({ message: e?.message || "Unlike failed" });
//   }
// };

// export const getPostLikes = async (req, res) => {
//   try {
//     const id = String(req.params.postId || "");
//     const type = String(req.query.type || "post");
//     console.log('id',id);
    

//     if (!mongoose.isValidObjectId(id))
//       return res.status(400).json({ message: "Invalid id" });
//     if (!isValidType(type))
//       return res.status(400).json({ message: "Invalid type" });

//     const page = Math.max(Number(req.query.page) || 1, 1);
//     const limit = Math.min(Number(req.query.limit) || 20, 50);
//     const skip = (page - 1) * limit;

//     // ✅ GROUP POST
//     if (type === "groupPost") {
//       const rows = await GroupPostLike.find({ postId: id })
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .populate("userId", "name username cover avatar uid")
//         .lean();

//       const users = rows.map((r) => r.userId).filter(Boolean);
//       return res.json({ success: true, page, limit, users });
//     }

//     // ✅ NORMAL POST
//     const rows = await PostLike.find({ post: id })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .populate("user", "name username cover avatar uid")
//       .lean();
    
    
//     const users = rows.map((r) => r.user).filter(Boolean);
//     // console.log("users", users);
//     return res.json({ success: true, page, limit, users });
//   } catch (e) {
//     return res
//       .status(500)
//       .json({ message: e?.message || "Fetch likes failed" });
//   }
// };

import mongoose from "mongoose";
import Post from "../../models/post/post.model.js";
import PostLike from "../../models/post/postLike.model.js"; // Note: আপনি চাইলে মডেলের নাম PostReaction করতে পারেন, এখানে আমি আপনার বর্তমান মডেলই রেখেছি।

import GroupPost from "../../models/group/groupPost.model.js";
import GroupPostLike from "../../models/group/groupPostLike.model.js";
import Ad from "../../models/ads/ad.model.js";

const isValidType = (t) =>
  t === "post" || t === "groupPost" || t === "ad";
// ফেসবুকের রিঅ্যাকশন টাইপ ভ্যালিডেশন
const VALID_REACTIONS = ["like", "love", "haha", "wow", "sad", "angry"];

// ✅ ১. লাইক দেওয়া বা রিঅ্যাকশন পরিবর্তন করার ফাংশন
// export const likePost = async (req, res) => {
//   try {
//     const me = req.user?._id;
//     const id = String(req.params.postId || "");
//     const type = String(req.query.type || "post"); 
//     const reactionType = String(
//       (req.body && req.body.reaction) || "like",
//     ).toLowerCase();

//     console.log("reactionType", req.body.reaction);
    

//     if (!me) return res.status(401).json({ message: "Unauthorized" });
//     if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });
//     if (!isValidType(type)) return res.status(400).json({ message: "Invalid type" });
//     if (!VALID_REACTIONS.includes(reactionType)) return res.status(400).json({ message: "Invalid reaction type" });

//     // --- GROUP POST ---
//     if (type === "groupPost") {
//       const post = await GroupPost.findOne({ _id: id, isDeleted: { $ne: true } }).select("_id counts.likeCount").lean();
//       if (!post) return res.status(404).json({ message: "Post not found" });

//       const existingReaction = await GroupPostLike.findOne({ postId: id, userId: me });
//       let nextLikeCount = Number(post?.counts?.likeCount || 0);

//       if (!existingReaction) {
//         // নতুন রিঅ্যাকশন (কাউন্ট বাড়বে)
//         await GroupPostLike.create({ postId: id, userId: me, type: reactionType });
//         const up = await GroupPost.findByIdAndUpdate(id, { $inc: { "counts.likeCount": 1 } }, { new: true, select: "counts.likeCount" }).lean();
//         nextLikeCount = Number(up?.counts?.likeCount || nextLikeCount + 1);
//       } else {
//         // রিঅ্যাকশন পরিবর্তন (কাউন্ট একই থাকবে)
//         await GroupPostLike.updateOne({ _id: existingReaction._id }, { $set: { type: reactionType } });
//       }

//       return res.json({ success: true, message: "Reacted", data: { id, type, isLiked: true, reaction: reactionType, likeCount: nextLikeCount } });
//     }

//     // --- NORMAL POST ---
//     const post = await Post.findOne({ _id: id, isDeleted: false }).select("_id likeCount").lean();
//     if (!post) return res.status(404).json({ message: "Post not found" });

//     const existingReaction = await PostLike.findOne({ post: id, user: me });
//     let nextLikeCount = Number(post?.likeCount || 0);

//     if (!existingReaction) {
//       // নতুন রিঅ্যাকশন (কাউন্ট বাড়বে)
//       await PostLike.create({ post: id, user: me, type: reactionType });
//       const up = await Post.findByIdAndUpdate(id, { $inc: { likeCount: 1 } }, { new: true, select: "likeCount" }).lean();
//       nextLikeCount = Number(up?.likeCount || nextLikeCount + 1);
//     } else {
//       // রিঅ্যাকশন পরিবর্তন (কাউন্ট একই থাকবে)
//       await PostLike.updateOne({ _id: existingReaction._id }, { $set: { type: reactionType } });
//     }

//     return res.json({ success: true, message: "Reacted", data: { id, type, isLiked: true, reaction: reactionType, likeCount: nextLikeCount } });
//   } catch (e) {
//     return res.status(500).json({ message: e?.message || "Reaction failed" });
//   }
// };

// ✅ ২. রিঅ্যাকশন বা লাইক রিমুভ করার ফাংশন (DELETE Request এর জন্য)
// export const unlikePost = async (req, res) => {
//   try {
//     const me = req.user?._id;
//     const id = String(req.params.postId || "");
//     const type = String(req.query.type || "post");

//     if (!me) return res.status(401).json({ message: "Unauthorized" });
//     if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });
//     if (!isValidType(type)) return res.status(400).json({ message: "Invalid type" });

//     // --- GROUP POST ---
//     if (type === "groupPost") {
//       const del = await GroupPostLike.deleteOne({ postId: id, userId: me });
//       let nextLikeCount = null;
//       if (del?.deletedCount) {
//         const up = await GroupPost.findByIdAndUpdate(id, { $inc: { "counts.likeCount": -1 } }, { new: true, select: "counts.likeCount" }).lean();
//         nextLikeCount = Number(up?.counts?.likeCount || 0);
//       }
//       return res.json({ success: true, message: "Reaction removed", data: { id, type, isLiked: false, reaction: null, likeCount: nextLikeCount } });
//     }

//     // --- NORMAL POST ---
//     const del = await PostLike.deleteOne({ post: id, user: me });
//     let nextLikeCount = null;
//     if (del?.deletedCount) {
//       const up = await Post.findByIdAndUpdate(id, { $inc: { likeCount: -1 } }, { new: true, select: "likeCount" }).lean();
//       nextLikeCount = Number(up?.likeCount || 0);
//     }
//     return res.json({ success: true, message: "Reaction removed", data: { id, type, isLiked: false, reaction: null, likeCount: nextLikeCount } });
//   } catch (e) {
//     return res.status(500).json({ message: e?.message || "Unlike failed" });
//   }
// };





// ✅ ১. লাইক দেওয়া বা রিঅ্যাকশন পরিবর্তন করার ক্লিন ফাংশন
export const likePost = async (req, res) => {
  try {
    const me = req.user?._id;
    const id = String(req.params.postId || "");
    const type = String(req.query.type || "post"); // post, groupPost, অথবা ad
    const reactionType = String(
      (req.body && req.body.reaction) || "like",
    ).toLowerCase();

    console.log('rakib',id,type,reactionType);
    
    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "Invalid id" });
    if (!VALID_REACTIONS.includes(reactionType))
      return res.status(400).json({ message: "Invalid reaction type" });

    // ==========================================
    // 📺 ১. AD CAMPAIGN LIKE (বিজ্ঞপ্তি লাইক ফ্লো)
    // ==========================================
    if (type === "ad") {
      const adCampaign = await Ad.findOne({ _id: id, status: "active" })
        .select("_id likeCount")
        .lean();
      if (!adCampaign)
        return res.status(404).json({ message: "Ad campaign not found" });

      const existingReaction = await PostLike.findOne({ post: id, user: me });
      let nextLikeCount = Number(adCampaign?.likeCount || 0);

      if (!existingReaction) {
        // নতুন রিঅ্যাকশন (বিজ্ঞপ্তির কাউন্টার ১ বাড়বে)
        await PostLike.create({ post: id, user: me, type: reactionType });
        const up = await Ad.findByIdAndUpdate(
          id,
          { $inc: { likeCount: 1 } },
          { new: true, select: "likeCount" },
        ).lean();
        nextLikeCount = Number(up?.likeCount || nextLikeCount + 1);
      } else {
        // শুধু ইমোজি পরিবর্তন (কাউন্ট একই থাকবে)
        await PostLike.updateOne(
          { _id: existingReaction._id },
          { $set: { type: reactionType } },
        );
      }

      return res.json({
        success: true,
        message: "Ad Reacted",
        data: {
          id,
          type,
          isLiked: true,
          reaction: reactionType,
          likeCount: nextLikeCount,
        },
      });
    }

    // ==========================================
    // 👥 ২. GROUP POST LIKE (গ্রুপ পোস্ট লাইক ফ্লো)
    // ==========================================
    if (type === "groupPost") {
      const post = await GroupPost.findOne({
        _id: id,
        isDeleted: { $ne: true },
      })
        .select("_id counts.likeCount")
        .lean();
      if (!post) return res.status(404).json({ message: "Post not found" });

      const existingReaction = await GroupPostLike.findOne({
        postId: id,
        userId: me,
      });
      let nextLikeCount = Number(post?.counts?.likeCount || 0);

      if (!existingReaction) {
        // নতুন রিঅ্যাকশন (গ্রুপ পোস্টের কাউন্টার ১ বাড়বে)
        await GroupPostLike.create({
          postId: id,
          userId: me,
          type: reactionType,
        });
        const up = await GroupPost.findByIdAndUpdate(
          id,
          { $inc: { "counts.likeCount": 1 } },
          { new: true, select: "counts.likeCount" },
        ).lean();
        nextLikeCount = Number(up?.counts?.likeCount || nextLikeCount + 1);
      } else {
        // শুধু ইমোজি পরিবর্তন (কাউন্ট একই থাকবে)
        await GroupPostLike.updateOne(
          { _id: existingReaction._id },
          { $set: { type: reactionType } },
        );
      }

      return res.json({
        success: true,
        message: "Group Post Reacted",
        data: {
          id,
          type,
          isLiked: true,
          reaction: reactionType,
          likeCount: nextLikeCount,
        },
      });
    }

    // ==========================================
    // 📱 ৩. NORMAL POST LIKE (সাধারণ পোস্ট লাইক ফ্লো)
    // ==========================================
    const post = await Post.findOne({ _id: id, isDeleted: false })
      .select("_id likeCount")
      .lean();
    if (!post) return res.status(404).json({ message: "Post not found" });

    const existingReaction = await PostLike.findOne({ post: id, user: me });
    let nextLikeCount = Number(post?.likeCount || 0);

    if (!existingReaction) {
      // নতুন রিঅ্যাকশন (সাধারণ পোস্টের কাউন্টার ১ বাড়বে)
      await PostLike.create({ post: id, user: me, type: reactionType });
      const up = await Post.findByIdAndUpdate(
        id,
        { $inc: { likeCount: 1 } },
        { new: true, select: "likeCount" },
      ).lean();
      nextLikeCount = Number(up?.likeCount || nextLikeCount + 1);
    } else {
      // শুধু ইমোজি পরিবর্তন (কাউন্ট একই থাকবে)
      await PostLike.updateOne(
        { _id: existingReaction._id },
        { $set: { type: reactionType } },
      );
    }

    return res.json({
      success: true,
      message: "Post Reacted",
      data: {
        id,
        type,
        isLiked: true,
        reaction: reactionType,
        likeCount: nextLikeCount,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Reaction failed" });
  }
};


// ✅ ২. রিঅ্যাকশন বা লাইক রিমুভ করার ফাংশন (DELETE Request)
export const unlikePost = async (req, res) => {
  try {
    const me = req.user?._id;
    const id = String(req.params.postId || "");
    const type = String(req.query.type || "post"); // post, groupPost, অথবা ad

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "Invalid id" });

    // ========================================================
    // 🌟 🌟 ২. নতুন যোগ করা হলো: বিজ্ঞপ্তির আনলাইক লজিক (type === "ad")
    // ========================================================
    if (type === "ad") {
      // আপনার বিদ্যমান 'PostLike' টেবিল থেকেই বিজ্ঞপ্তির লাইক রো-টি ডিলিট করা হচ্ছে
      const del = await PostLike.deleteOne({ post: id, user: me });
      let nextLikeCount = null;

      // যদি সফলভাবে ডাটাবেস থেকে ডিলিট সম্পন্ন হয়
      if (del?.deletedCount) {
        // মেইন Ad ক্যাম্পেইন টেবিলে গিয়ে লাইক সংখ্যা ১ কমিয়ে দেওয়া
        const up = await Ad.findByIdAndUpdate(
          id,
          { $inc: { likeCount: -1 } },
          { new: true, select: "likeCount" },
        ).lean();

        nextLikeCount = Math.max(0, Number(up?.likeCount || 0)); // সেফটি চেক যাতে কাউন্ট কখনো মাইনাসে না যায়
      }

      return res.json({
        success: true,
        message: "Ad Reaction removed",
        data: {
          id,
          type,
          isLiked: false,
          reaction: null,
          likeCount: nextLikeCount,
        },
      });
    }

    // --- GROUP POST --- (আপনার আগের কোড হুবহু অপরিবর্তিত রাখা হয়েছে)
    if (type === "groupPost") {
      const del = await GroupPostLike.deleteOne({ postId: id, userId: me });
      let nextLikeCount = null;
      if (del?.deletedCount) {
        const up = await GroupPost.findByIdAndUpdate(
          id,
          { $inc: { "counts.likeCount": -1 } },
          { new: true, select: "counts.likeCount" },
        ).lean();
        nextLikeCount = Number(up?.counts?.likeCount || 0);
      }
      return res.json({
        success: true,
        message: "Reaction removed",
        data: {
          id,
          type,
          isLiked: false,
          reaction: null,
          likeCount: nextLikeCount,
        },
      });
    }

    // --- NORMAL POST --- (আপনার আগের কোড হুবহু অপরিবর্তিত রাখা হয়েছে)
    const del = await PostLike.deleteOne({ post: id, user: me });
    let nextLikeCount = null;
    if (del?.deletedCount) {
      const up = await Post.findByIdAndUpdate(
        id,
        { $inc: { likeCount: -1 } },
        { new: true, select: "likeCount" },
      ).lean();
      nextLikeCount = Number(up?.likeCount || 0);
    }
    return res.json({
      success: true,
      message: "Reaction removed",
      data: {
        id,
        type,
        isLiked: false,
        reaction: null,
        likeCount: nextLikeCount,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Unlike failed" });
  }
};



// ✅ গেট রিঅ্যাকশন লিস্ট (ইউজারের নামের সাথে কে কোন রিঅ্যাকশন দিয়েছে তাও জানা যাবে)
export const getPostLikes = async (req, res) => {
  try {
    const id = String(req.params.postId || "");
    const type = String(req.query.type || "post");

    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "Invalid id" });
    if (!isValidType(type))
      return res.status(400).json({ message: "Invalid type" });

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    // ========================================================
    // 🌟 🌟 ১. নতুন যোগ করা হলো: বিজ্ঞপ্তির লাইক ও রিয়্যাকশন লিস্ট দেখার লজিক (type === "ad")
    // ========================================================
    if (type === "ad") {
      // আপনার 'PostLike' টেবিল থেকেই বিজ্ঞপ্তির আইডি ধরে লাইক করা ইউজারদের খোঁজা হচ্ছে
      const rows = await PostLike.find({ post: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name username cover avatar uid") // ইউজার কালেকশন থেকে প্রোফাইল পপুলেট
        .lean();

      // রেসপন্স অবজেক্ট তৈরি এবং ডিফেন্সিভ ফিল্টারিং
      const users = rows
        .map((r) => ({
          ...r.user,
          reaction: r.type || "like", // ব্যবহারকারী বিজ্ঞপ্তিতে কী রিয়্যাক্ট (Love, Haha) করেছে তা ম্যাপ করা হলো
        }))
        .filter((u) => u._id);

      return res.json({ success: true, page, limit, users });
    }

    // ✅ GROUP POST
    if (type === "groupPost") {
      const rows = await GroupPostLike.find({ postId: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name username cover avatar uid")
        .lean();

      const users = rows
        .map((r) => ({
          ...r.userId,
          reaction: r.type || "like", // রেসপন্সে রিঅ্যাকশন টাইপ যুক্ত করা হলো
        }))
        .filter((u) => u._id);

      return res.json({ success: true, page, limit, users });
    }

    // ✅ NORMAL POST
    const rows = await PostLike.find({ post: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name username cover avatar uid")
      .lean();

    const users = rows
      .map((r) => ({
        ...r.user,
        reaction: r.type || "like", // রেসপন্সে রিঅ্যাকশন টাইপ যুক্ত করা হলো
      }))
      .filter((u) => u._id);

    return res.json({ success: true, page, limit, users });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Fetch reactions failed" });
  }
};
