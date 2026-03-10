import { getVideoFeed } from "../../services/feed/getVideoFeed.js";

const parseCursor = (raw) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// GET /feed/videos/general?limit=20&cursor=...
export const getGeneralVideos = async (req, res) => {
  try {
    const userId = req.user?._id;
    const limit = req.query.limit;
    const cursor = parseCursor(req.query.cursor);
    const sub = req.query.subCategory; // optional: islamic/sports/other

    const data = await getVideoFeed({
      userId,
      limit,
      cursor,
      category: "general",
      subCategory: sub || undefined,
    });

    return res.json({ success: true, ...data });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "General videos failed" });
  }
};

// GET /feed/videos/general/:id
// export const getGeneralVideoById = async (req, res) => {
//   try {
//     const userId = req.user?._id;
//     const videoId = req.params.id;

//     console.log("user id",userId);
//     console.log("video id",videoId);
    

//     if (!videoId) {
//       return res.status(400).json({ message: "Video id is required" });
//     }

//     // 🎬 main video
//     const video = await Video.findOne({
//       _id: videoId,
//       category: "general",
//       status: "published",
//     })
//       .populate("author", "username avatar isVerified")
//       .lean();

//     if (!video) {
//       return res.status(404).json({ message: "Video not found" });
//     }

//     // 👍 user like status
//     let isLiked = false;
//     if (userId) {
//       const like = await Like.findOne({
//         user: userId,
//         video: videoId,
//       }).lean();

//       isLiked = !!like;
//     }

//     // 🔢 counts
//     const [likeCount, commentCount] = await Promise.all([
//       Like.countDocuments({ video: videoId }),
//       Comment.countDocuments({ video: videoId }),
//     ]);

//     // 📺 related videos (same subCategory first, fallback to category)
//     const relatedQuery = {
//       _id: { $ne: videoId },
//       category: "general",
//       status: "published",
//     };

//     if (video.subCategory) {
//       relatedQuery.subCategory = video.subCategory;
//     }

//     const relatedVideos = await Video.find(relatedQuery)
//       .sort({ createdAt: -1 })
//       .limit(12)
//       .populate("author", "username avatar isVerified")
//       .lean();

//     return res.json({
//       success: true,
//       video: {
//         ...video,
//         isLiked,
//         likeCount,
//         commentCount,
//       },
//       relatedVideos,
//     });
//   } catch (e) {
//     return res
//       .status(500)
//       .json({ message: e?.message || "Get video failed" });
//   }
// };


// GET /feed/videos/reels?limit=20&cursor=...
export const getReelsVideos = async (req, res) => {
  try {
    const userId = req.user?._id;
    const limit = req.query.limit;
    const cursor = parseCursor(req.query.cursor);
    const sub = req.query.subCategory; // optional: funny/other/...

    const data = await getVideoFeed({
      userId,
      limit,
      cursor,
      category: "reels",
      subCategory: sub || undefined,
    });

    return res.json({ success: true, ...data });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Reels videos failed" });
  }
};
