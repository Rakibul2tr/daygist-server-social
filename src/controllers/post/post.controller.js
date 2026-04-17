import Post from "../../models/post/post.model.js";
import Save from "../../models/post/save.model.js";
import PostShare from "../../models/post/postShare.model.js";
import Comment from "../../models/comment/comment.model.js";
import VideoView from "../../models/post/videoView.model.js";
import { getHomeFeed } from "../../services/feed/feed.service.js";
import { deleteManyFromWasabi, uploadToWasabiFilePath } from "../../services/wbUpload.service.js";
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
      postType
    } = req.body || {};

    const postContentType = ["text", "image", "video"].includes(type) ? type : null;
    if (!postContentType)
      return res.status(400).json({ message: "Invalid post type" });

    const safePrivacy = ["public", "followers", "only_me"].includes(privacy)
      ? privacy
      : "public";

    const toStr = (v) => (typeof v === "string" ? v.trim() : "");
    const isValidUrl = (u) => typeof u === "string" && /^https?:\/\//i.test(u);

    // ✅ unify caption/text into one "text"
    const cleanText = toStr(postContentType === "text" ? text : caption);

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
      postContentType === "video" && ["normal", "reels", "live"].includes(videoMode)
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
            m?.provider
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

      if (!safeMedias.length && !cleanText) {
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
              video?.provider
            )
              ? video.provider
              : undefined,
            publicId: toStr(video?.publicId) || undefined,
            key: toStr(video?.key) || undefined,

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

      if (!safeMedias.length && !cleanText) {
        return res
          .status(400)
          .json({ message: "Video post needs video url or caption." });
      }
    }

    if (postContentType === "text") {
      if (!cleanText)
        return res.status(400).json({ message: "Text post needs text." });
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
            m?.provider
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
    });

    const populated = await Post.findById(doc._id).populate(
      "author",
      "name username avatar"
    );

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

    if(post.type == "text"){
      post.text = (text || "").trim();
    }
    post.text = (text || "").trim();
    await post.save();

    const populated = await Post.findById(post._id).populate(
      "author",
      "name username avatar"
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
    let isFollowingAuthor = false;

    
    if (me) {
      const [likedRow, sharedRow, followingRow] = await Promise.all([
        PostLike.exists({ user: me, post: postId }),
        PostShare.exists({ user: me, post: postId }),
        Follow.exists({ follower: me, following: post.author?._id }),
      ]);
      // console.log('liked row',likedRow);
      

      isLiked = !!likedRow;
      isShared = !!sharedRow;
      isFollowingAuthor = !!followingRow;
    }

    const shareLink = `${process.env.PUBLIC_APP_BASE_URL || ""}/post/${post._id}`;

    return res.json({
      success: true,
      post: {
        ...post,
        isLiked,
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
      {
        user: userId,
        targetId: postId,
        targetType,
      },
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
      if (targetType === "post") {
        await Post.updateOne({ _id: postId }, { $inc: { saveCount: 1 } });
      } else {
        await GroupPost.updateOne({ _id: postId }, { $inc: { saveCount: 1 } });
      }

      return res.json({
        success: true,
        saved: true,
        message: "Saved successful",
      });
    }

    return res.json({
      success: true,
      saved: false,
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

    const deleted = await Save.deleteOne({
      user: userId,
      targetId: postId,
      targetType,
    });

    if (deleted.deletedCount) {
      if (targetType === "post") {
        await Post.updateOne({ _id: postId }, { $inc: { saveCount: -1 } });
      } else {
        await GroupPost.updateOne({ _id: postId }, { $inc: { saveCount: -1 } });
      }
    }

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Unsave failed" });
  }
};

export const getSavedPosts = async (req, res) => {
  console.log('req');
  
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
      posts:items, // ✅ FIXED
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