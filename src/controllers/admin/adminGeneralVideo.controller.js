import { getVideoFeed } from "../../services/feed/getVideoFeed.js";

const parseCursor = (raw) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// ==========================
// ADMIN: GET VIDEOS FEED
// ==========================
// GET /admin/videos?category=general&subCategory=islamic&limit=20&page=1&q=search
export const adminGetVideos = async (req, res) => {
  try {
    const userId = req.user?._id;

    // ======================
    // QUERY PARAMS
    // ======================
    const limit = Math.max(parseInt(req.query.limit) || 20, 1);
    const page = Math.max(parseInt(req.query.page) || 1, 1);

    const cursor = parseCursor(req.query.cursor);

    const category = req.query.type; // general | reels | undefined (all)
    const subCategory = req.query.subCategory;
    const q = req.query.q?.trim(); // search text

    const author = req.query.userId; // optional filter by user

    // ======================
    // BUILD FILTER INPUT
    // ======================
    const filters = {
      userId,
      limit,
      cursor,
      category: category || undefined,
      subCategory: subCategory || undefined,
      search: q || undefined,
      authorId: author || undefined,
    };

    // ======================
    // SERVICE CALL
    // ======================
    const data = await getVideoFeed(filters);

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Admin videos fetch failed",
    });
  }
};
