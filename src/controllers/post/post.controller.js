import mongoose from "mongoose";
import Post from "../../models/post/post.model.js";
import Save from "../../models/post/save.model.js";
import PostShare from "../../models/post/postShare.model.js";
import Comment from "../../models/comment/comment.model.js";
import VideoView from "../../models/post/videoView.model.js";
import { getHomeFeed } from "../../services/feed/feed.service.js";
import {
  deleteManyFromWasabi,
  uploadToWasabiFilePath,
} from "../../services/wbUpload.service.js";
import PostLike from "../../models/post/postLike.model.js";
import Follow from "../../models/follow/follow.model.js";
import GroupPost from "../../models/group/groupPost.model.js";

const isOwner = (post, userId) => String(post.author) === String(userId);
const toStr = (v) => (typeof v === "string" ? v.trim() : "");
const isValidUrl = (u) => typeof u === "string" && u.startsWith("http");

export const createPost = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      type,
      privacy,

      // unified text/caption
      text,
      caption,
      feeling,

      // text extras
      backgroundUrl,
      textStyle,

      // image payload
      images,
      layout,

      // video payload
      video,
      mutedByDefault,
      loop,
      videoMode,

      // categories
      category,
      subCategory,

      // legacy
      medias,
      postType,
      isRePost,
      sharedPostId,
    } = req.body || {};

    const postContentType = ["text", "image", "video"].includes(type)
      ? type
      : null;
    if (!postContentType)
      return res.status(400).json({ message: "Invalid post type" });

    // ✅ STEP: daily post limit check
    const nowDate = new Date();
    // ✅ UTC start of day
    const startOfDay = new Date(
      Date.UTC(
        nowDate.getUTCFullYear(),
        nowDate.getUTCMonth(),
        nowDate.getUTCDate(),
        0,
        0,
        0,
      ),
    );

    // ✅ UTC end of day
    const endOfDay = new Date(
      Date.UTC(
        nowDate.getUTCFullYear(),
        nowDate.getUTCMonth(),
        nowDate.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    const todayPostCount = await Post.countDocuments({
      author: userId,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (todayPostCount >= 20) {
      return res.status(400).json({
        success: false,
        message: "Daily post limit reached (20 posts per day)",
      });
    }

    // ✅ STEP: last post cooldown check (5 minutes)

    const FIVE_MINUTES = 5 * 60 * 1000;

    const lastPost = await Post.findOne({ author: userId })
      .sort({ createdAt: -1 })
      .select("createdAt");

    if (lastPost) {
      const now = Date.now();
      const lastTime = new Date(lastPost.createdAt).getTime();

      const diff = now - lastTime;

      if (diff < FIVE_MINUTES) {
        const remaining = Math.ceil((FIVE_MINUTES - diff) / 1000);
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;


        return res.status(400).json({
          success: false,
          message: `Wait ${minutes}m ${seconds}s before next post`,
        });
      }
    }

    const safePrivacy = ["public", "followers", "only_me"].includes(privacy)
      ? privacy
      : "public";

    const toStr = (v) => (typeof v === "string" ? v.trim() : "");
    const isValidUrl = (u) => typeof u === "string" && /^https?:\/\//i.test(u);

    // ✅ unify caption/text into one "text"
    // const cleanText = toStr(postContentType === "text" ? text : caption);
    const cleanText = toStr(text || caption);

    // ✅ sanitize textStyle (align enum)
    const safeTextStyle =
      postContentType === "text" && textStyle
        ? {
            color: textStyle?.color || null,
            fontSize: Number.isFinite(Number(textStyle?.fontSize))
              ? Number(textStyle.fontSize)
              : null,
            fontWeight: textStyle?.fontWeight || null,
            align: ["left", "center"].includes(textStyle?.align)
              ? textStyle.align
              : "center",
          }
        : null;

    // ✅ derive category safely (model enum: general|reels)
    const safeVideoMode =
      postContentType === "video" &&
      ["normal", "reels", "live"].includes(videoMode)
        ? videoMode
        : "normal";

    const safeCategory =
      postContentType === "video"
        ? safeVideoMode === "reels" || category === "reels"
          ? "reels"
          : "general"
        : "general";

    const safeSubCategory = toStr(subCategory) || "other";

    // ✅ build medias
    let safeMedias = [];

     const isPostShared = !!isRePost && !!sharedPostId;
     if (isPostShared) {
       const originalPost =
         await Post.findById(sharedPostId).select("_id isDeleted");

       if (!originalPost || originalPost.isDeleted) {
         return res.status(404).json({
           message: "Shared post not found",
         });
       }
     }

    if (postContentType === "image") {
      const arr = Array.isArray(images) ? images : [];
      safeMedias = arr
        .filter((m) => isValidUrl(m?.url))
        .slice(0, 10)
        .map((m) => ({
          url: m.url,
          type: "image",

          // optional meta (for delete support)
          provider: ["cloudinary", "wasabi", "s3", "local"].includes(
            m?.provider,
          )
            ? m.provider
            : undefined,
          publicId: toStr(m?.publicId) || undefined,
          key: toStr(m?.key) || undefined,

          width: Number.isFinite(Number(m?.width))
            ? Number(m.width)
            : undefined,
          height: Number.isFinite(Number(m?.height))
            ? Number(m.height)
            : undefined,
        }));

      
      if (!isPostShared && !safeMedias.length && !cleanText) {
        return res
          .status(400)
          .json({ message: "Image post needs images or caption." });
      }
    }

    if (postContentType === "video") {
      const vurl = toStr(video?.url);
      if (vurl && isValidUrl(vurl)) {
        const thumb = toStr(video?.thumbnailUrl);

        safeMedias = [
          {
            url: vurl,
            type: "video",

            provider: ["cloudinary", "wasabi", "s3", "local"].includes(
              video?.provider,
            )
              ? video.provider
              : undefined,
            publicId: toStr(video?.publicId) || undefined,
            key: toStr(video?.key) || undefined,
            width: video?.width,
            height: video?.height,

            // ✅ IMPORTANT: thumbnail should be remote url, not file://
            thumbnailUrl: isValidUrl(thumb) ? thumb : undefined,

            duration: Number.isFinite(Number(video?.durationSec))
              ? Number(video.durationSec)
              : undefined,
            width: Number.isFinite(Number(video?.width))
              ? Number(video.width)
              : undefined,
            height: Number.isFinite(Number(video?.height))
              ? Number(video.height)
              : undefined,
          },
        ];
      }

       if (!isPostShared && !safeMedias.length && !cleanText) {
         return res
           .status(400)
           .json({ message: "Video post needs video url or caption." });
       }
    }

   
    const hasText = !!cleanText?.trim();
    const hasMedia = safeMedias.length > 0;
    const isRepostValid = isPostShared;

    if (!hasText && !hasMedia && !isRepostValid) {
      return res.status(400).json({
        message: "Post must have text, media or shared post",
      });
      safeMedias = [];
    }

    // ✅ Legacy support
    if (!safeMedias.length && Array.isArray(medias)) {
      safeMedias = medias
        .filter((m) => m?.url && (m?.type === "image" || m?.type === "video"))
        .slice(0, 10)
        .map((m) => ({
          url: m.url,
          type: m.type,
          provider: ["cloudinary", "wasabi", "s3", "local"].includes(
            m?.provider,
          )
            ? m.provider
            : undefined,
          publicId: toStr(m?.publicId) || undefined,
          key: toStr(m?.key) || undefined,
          thumbnailUrl: isValidUrl(toStr(m?.thumbnailUrl))
            ? toStr(m.thumbnailUrl)
            : undefined,
        }));
    }

    const doc = await Post.create({
      author: userId,
      type: postContentType,
      privacy: safePrivacy,

      text: cleanText || "",
      feeling: toStr(feeling) || null,

      // text extras
      backgroundUrl:
        postContentType === "text" && isValidUrl(backgroundUrl)
          ? backgroundUrl
          : null,
      textStyle: safeTextStyle,

      // medias
      medias: safeMedias,

      // image extras
      layout:
        postContentType === "image" &&
        ["single", "grid2", "grid3", "carousel"].includes(layout)
          ? layout
          : null,

      // video extras
      mutedByDefault: postContentType === "video" ? !!mutedByDefault : true,
      loop: postContentType === "video" ? !!loop : false,
      videoMode: safeVideoMode,

      // category/subCategory (safe)
      category: safeCategory,
      subCategory: safeSubCategory,
      postType: postType ? postType : "post",
      isRePost: isPostShared,
      sharedPostId: isPostShared ? sharedPostId : null,
    });

    const populated = await Post.findById(doc._id)
    .populate("author","name username avatar")
    .populate({
        path: "sharedPostId",
        populate: [
          { path: "author", select: "name username avatar" },
          { path: "groupId", select: "groupName groupAvatar" } 
        ]
      });

    return res.json({ success: true, post: populated });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Create post failed" });
  }
};
//done f - s

export const updatePost = async (req, res) => {
  try {
    const userId = req.user?._id;
    const postId = req.params.id;
    const { text } = req.body;

    const post = await Post.findById(postId);
    if (!post || post.isDeleted)
      return res.status(404).json({ message: "Post not found" });

    if (!isOwner(post, userId))
      return res.status(403).json({ message: "Forbidden" });

    if (post.type == "text") {
      post.text = (text || "").trim();
    }
    post.text = (text || "").trim();
    await post.save();

    const populated = await Post.findById(post._id).populate(
      "author",
      "name username avatar",
    );
    return res.json({ success: true, post: populated });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Update post failed" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const userId = req.user?._id;
    const postId = req.params.id;

    const post = await Post.findById(postId).lean();
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (String(post.author) !== String(userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // wasabi media keys collect
    const keys = [];
    for (const m of post.medias || []) {
      if (m?.provider === "wasabi" && m?.key) keys.push(m.key);
      if (m?.thumbnailProvider === "wasabi" && m?.thumbnailKey) {
        keys.push(m.thumbnailKey);
      }
    }

    // 1) soft delete post
    await Post.updateOne(
      { _id: postId },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          likeCount: 0,
          commentCount: 0,
          shareCount: 0,
          viewCount: 0,
          saveCount: 0,
        },
      },
    );

    // 2) related docs delete
    const [likeRes, shareRes, commentRes, viewRes, saveRes] = await Promise.all(
      [
        PostLike.deleteMany({ post: postId }),
        PostShare.deleteMany({ post: postId }),
        Comment.deleteMany({ postId: postId, targetType: "post" }),
        VideoView.deleteMany({ post: postId }),
        Save.deleteMany({ post: postId }),
      ],
    );

    // 3) wasabi media delete (best effort)
    let mediaDeleted = 0;
    if (keys.length) {
      try {
        const out = await deleteManyFromWasabi(keys);
        mediaDeleted = out?.deleted || 0;
      } catch (err) {
        console.log("Wasabi delete failed:", err?.message || err);
      }
    }

    return res.json({
      success: true,
      message: "Post deleted successfully",
      mediaDeleted,
      deletedRelated: {
        likes: likeRes.deletedCount || 0,
        shares: shareRes.deletedCount || 0,
        comments: commentRes.deletedCount || 0,
        views: viewRes.deletedCount || 0,
        saves: saveRes.deletedCount || 0,
      },
    });
  } catch (e) {
    return res.status(500).json({
      message: e?.message || "Delete post failed",
    });
  }
};

// export const getPostById = async (req, res) => {
//   try {
//     const postId = req.params.id;

//     const post = await Post.findOne({ _id: postId, isDeleted: false }).populate(
//       "author",
//       "name username avatar"
//     );

//     if (!post) return res.status(404).json({ message: "Post not found" });

//     // share link (frontend handle করবে)
//     const shareLink = `${process.env.PUBLIC_APP_BASE_URL || ""}/post/${
//       post._id
//     }`;

//     return res.json({ success: true, post, shareLink });
//   } catch (e) {
//     return res.status(500).json({ message: e?.message || "Get post failed" });
//   }
// };

export const getPostById = async (req, res) => {
  try {
    const postId = req.params.id;
    const me = req.user?._id || null;

    const post = await Post.findOne({ _id: postId, isDeleted: false })
      .populate("author", "name username avatar")
      .lean();

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    let isLiked = false;
    let isShared = false;
    let reaction = null; 
    let isFollowingAuthor = false;

    if (me) {
      const [likedRow, sharedRow, followingRow] = await Promise.all([
        PostLike.findOne({ user: me, post: postId }).select("type").lean(),
        PostShare.exists({ user: me, post: postId }),
        Follow.exists({ follower: me, following: post.author?._id }),
      ]);
      // console.log('liked row',likedRow);

      isLiked = !!likedRow;
      reaction = likedRow ? likedRow.type || "like" : null;
      isShared = !!sharedRow;
      isFollowingAuthor = !!followingRow;
    }

    const shareLink = `${process.env.PUBLIC_APP_BASE_URL || ""}/post/${post._id}`;

    return res.json({
      success: true,
      post: {
        ...post,
        isLiked,
        reaction,
        isShared,
        isFollowingAuthor,
      },
      shareLink,
    });
  } catch (e) {
    return res.status(500).json({
      message: e?.message || "Get post failed",
    });
  }
};

export const getFeed = async (req, res) => {
  try {
    const userId = req.user?._id;
    const limit = req.query.limit;

    let cursor = null;
    if (req.query.cursor) {
      try {
        cursor = JSON.parse(req.query.cursor);
      } catch {
        cursor = null;
      }
    }
    // console.log('limit',limit,cursor);

    const data = await getHomeFeed({ userId, limit, cursor });
    // console.log('data',data.items.length);

    return res.json({ success: true, ...data });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Feed failed" });
  }
}; // done f- s

// Save/Unsave
export const savePost = async (req, res) => {
  try {
    const userId = req.user?._id;
    const postId = req.params.id;

    const targetType =
      req.body?.targetType === "groupPost" ? "groupPost" : "post";

    const Model = targetType === "post" ? Post : GroupPost;

    const post = await Model.findOne({ _id: postId, isDeleted: false });
    if (!post) return res.status(404).json({ message: "Not found" });

    const r = await Save.updateOne(
      { user: userId, targetId: postId, targetType },
      {
        $setOnInsert: {
          user: userId,
          targetId: postId,
          targetType,
        },
      },
      { upsert: true },
    );

    const inserted = r?.upsertedCount === 1 || !!r?.upsertedId;

    if (inserted) {
      await Model.updateOne({ _id: postId }, { $inc: { saveCount: 1 } });

      return res.json({
        success: true,
        isSaved: true, // ✅ clear
        message: "Saved successful",
      });
    }

    return res.json({
      success: true,
      isSaved: true, // ⚠️ already saved হলেও true
      message: "Already saved",
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Save failed" });
  }
}; // done f - s

export const unsavePost = async (req, res) => {
  try {
    const userId = req.user?._id;
    const postId = req.params.id;

    const targetType =
      req.body?.targetType === "groupPost" ? "groupPost" : "post";

    const Model = targetType === "post" ? Post : GroupPost;

    const deleted = await Save.deleteOne({
      user: userId,
      targetId: postId,
      targetType,
    });

    if (deleted.deletedCount) {
      await Model.updateOne({ _id: postId }, { $inc: { saveCount: -1 } });
    }

    return res.json({
      success: true,
      isSaved: false, // ✅ important
      message: "Unsaved",
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Unsave failed" });
  }
};

export const getSavedPosts = async (req, res) => {
  // console.log("req");
  try {
    const userId = req.user?._id;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const saves = await Save.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    // console.log('saves',saves);

    const postIds = saves
      .filter((s) => s.targetType === "post")
      .map((s) => s.targetId);

    const groupPostIds = saves
      .filter((s) => s.targetType === "groupPost")
      .map((s) => s.targetId);

    const [postsData, groupPosts] = await Promise.all([
      Post.find({ _id: { $in: postIds }, isDeleted: false })
        .populate("author", "name username avatar")
        .lean(),

      GroupPost.find({ _id: { $in: groupPostIds }, isDeleted: { $ne: true } })
        .populate("authorId", "name avatar")
        .populate("groupId", "name privacy coverUrl")
        .lean(),
    ]);

    const postMap = new Map(postsData.map((p) => [String(p._id), p]));

    const groupMap = new Map(
      groupPosts.map((p) => [
        String(p._id),
        {
          ...p,
          author: p.authorId
            ? {
                _id: p.authorId._id,
                name: p.authorId.name,
                avatar: p.authorId.avatar,
              }
            : null,
        },
      ]),
    );

    const items = saves
      .map((s) => {
        const id = String(s.targetId);
        return s.targetType === "post" ? postMap.get(id) : groupMap.get(id);
      })
      .filter(Boolean);
    // console.log('items',items);

    return res.json({
      success: true,
      posts: items, // ✅ FIXED
      nextCursor: null,
    });
  } catch (e) {
    return res.status(500).json({
      message: e?.message || "Saved list failed",
    });
  }
};
// export const getSavedPosts = async (req, res) => {
//   try {
//     const userId = req.user?._id;
//     const limit = Math.min(Number(req.query.limit) || 20, 50);
//     const page = Math.max(Number(req.query.page) || 1, 1);
//     const skip = (page - 1) * limit;

//     const saves = await Save.find({ user: userId })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     const postIds = saves
//       .filter((s) => s.targetType === "post")
//       .map((s) => s.targetId);

//     const groupPostIds = saves
//       .filter((s) => s.targetType === "groupPost")
//       .map((s) => s.targetId);

//     const [gPosts, groupPosts] = await Promise.all([
//       Post.find({ _id: { $in: postIds }, isDeleted: false })
//         .populate("author", "name username avatar")
//         .lean(),

//       GroupPost.find({ _id: { $in: groupPostIds }, isDeleted: { $ne: true } })
//         .populate("authorId", "name avatar")
//         .populate("groupId", "name privacy coverUrl")
//         .lean(),
//     ]);

//     // 🔥 map by id for fast lookup
//     const postMap = new Map(gPosts.map((p) => [String(p._id), p]));
//     const groupMap = new Map(groupPosts.map((p) => [String(p._id), p]));

//     const posts = saves
//       .map((s) => {
//         const id = String(s.targetId);

//         if (s.targetType === "post") {
//           return postMap.get(id);
//         } else {
//           return groupMap.get(id);
//         }
//       })
//       .filter(Boolean);

//     return res.json({
//       success: true,
//       posts, // ✅ frontend friendly
//       nextCursor: null, // (later cursor add করতে পারবি)
//     });
//   } catch (e) {
//     return res.status(500).json({ message: e?.message || "Saved list failed" });
//   }
// };

// long video crate post

export const createLongVideoPost = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // ✅ text fields
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim();
    const subCategory = String(req.body?.subCategory || "other").trim();

    // ✅ media from frontend
    const video = req.body?.video;
    const thumbnail = req.body?.thumbnail;

    if (!video?.url || !video?.key) {
      return res.status(400).json({
        success: false,
        message: "Video data required",
      });
    }

    // ✅ save post (NO upload)
    const doc = await Post.create({
      author: userId,
      type: "video",
      privacy: "public",
      text: title,
      description,
      category: "general",
      subCategory: subCategory || "other",
      videoMode: "normal",
      videoClickCount: 0,
      status: "pending",

      medias: [
        {
          type: "video",
          url: video.url,
          key: video.key,
          provider: video.provider || "wasabi",
          thumbnailUrl: thumbnail?.url || null,
          thumbnailKey: thumbnail?.key || null,
        },
      ],
    });

    return res.json({
      success: true,
      post: doc,
    });
  } catch (e) {
    console.log("createLongVideoPost error:", e);
    return res.status(500).json({
      success: false,
      message: e?.message || "Upload failed",
    });
  }
};

export const updateLongVideoPost = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params; // ভিডিও পোস্টের আইডি

    // ক) ইউজার অথেনটিকেশন ও আইডি ভ্যালিডেশন চেক
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Post ID" });
    }

    // খ) ডাটাবেস থেকে আগে ভিডিও পোস্টটি খুঁজে বের করা
    const post = await Post.findById(id);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Video post not found" });
    }

    // গ) ওনারশিপ ভেরিফিকেশন (অন্য কেউ যাতে অন্যের ভিডিও এডিট করতে না পারে)
    if (String(post.author) !== String(userId)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "You are not authorized to edit this post",
        });
    }

    // ঘ) ডাইনামিক ফিল্ড কাস্টিং (শুধুমাত্র ফ্রন্টএন্ড থেকে আসা তথ্যগুলোই আপডেট হবে)
    const updateFields = {};

    if (req.body.title !== undefined)
      updateFields.text = String(req.body.title).trim();
    if (req.body.description !== undefined)
      updateFields.description = String(req.body.description).trim();
    if (req.body.subCategory !== undefined)
      updateFields.subCategory = String(req.body.subCategory).trim();
    if (req.body.updateReason !== undefined)
      updateFields.updateReason = String(req.body.updateReason).trim();
    if (req.body.status !== undefined){
      updateFields.status = String(req.body.status).trim();
    }else{
      updateFields.status = "pending";
    }
      

     
    // 🌟 ঙ) নতুন থাম্বনেইল আপডেট এবং পুরনো থাম্বনেইল ওয়াসাবি থেকে মুছে ফেলার লজিক
    if (
      req.body.thumbnail &&
      req.body.thumbnail.url &&
      req.body.thumbnail.key
    ) {
      const currentMedias = post.medias || [];

      // মিডিয়া অ্যারের প্রথম আইটেমটিতে (ভিডিওর সাথে) নতুন থাম্বনেইল অবজেক্ট মার্জ করা হচ্ছে
      if (currentMedias.length > 0 && currentMedias[0].type === "video") {
        // 🌟 চ) ওল্ড থাম্বনেইল ডিলিট কন্ডিশন: যদি ফ্রন্টএন্ড থেকে oldThumbnailKey পাঠানো হয়
        if (req.body.oldThumbnailKey) {
          try {
            const keysToDelete = [req.body.oldThumbnailKey];
            console.log(
              "Attempting to remove old thumbnail from Wasabi:",
              keysToDelete,
            );

            // আপনার মেথড দিয়ে ওয়াসাবি থেকে ওল্ড কাভার ডিলিট করা
            const out = await deleteManyFromWasabi(keysToDelete);
            console.log("Wasabi thumbnail delete response:", out);
          } catch (wasabiError) {
            // কোনো কারণে ওয়াসাবি ডিলিট ফেল করলেও যেন ডাটাবেস প্রসেস না আটকায় তার জন্য ক্যাচ ব্লক
            console.error(
              "Failed to delete old thumbnail from Wasabi storage:",
              wasabiError.message,
            );
          }
        }

        // নতুন থাম্বনেইলের ইউআরএল ও কি অ্যাসাইন করা
        currentMedias[0].thumbnailUrl = req.body.thumbnail.url;
        currentMedias[0].thumbnailKey = req.body.thumbnail.key;
        updateFields.medias = currentMedias;
      }
    }

    // ছ) ডাটাবেসে আপডেট সম্পাদন করা
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true },
    );

    return res.json({
      success: true,
      message:
        "Video post info updated and old thumbnail cleared from storage.",
      post: updatedPost,
    });
  } catch (error) {
    console.error("updateLongVideoPost error:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Update failed",
    });
  }
};

// search videos
export const searchVideos = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.json({ success: true, items: [] });
    }

    const items = await Post.find({
      isDeleted: false,
      type: "video",
      category: "general", // ✅ reels avoid
      $text: { $search: q }, // 🔥 powerful search
      subCategory: { $exists: true },
    })
      .select({
        score: { $meta: "textScore" },
      })
      .populate("author", "name avatar")
      .sort({ score: { $meta: "textScore" } }) // 🔥 relevance অনুযায়ী sort
      .limit(20);

    res.json({ success: true, items });
  } catch (e) {
    console.log("searchVideos error:", e);
    res.status(500).json({ success: false, message: "Search failed" });
  }
};
function safeUnlink(p) {
  try {
    fs.unlinkSync(p);
  } catch {}
}
