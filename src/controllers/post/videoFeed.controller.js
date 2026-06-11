import { getVideoFeed } from "../../services/feed/getVideoFeed.js";

const parseCursor = (raw) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};


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
