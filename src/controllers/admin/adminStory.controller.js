// FILE: src/controllers/admin/adminStory.controller.js
import mongoose from "mongoose";
import Story from "../../models/stories/story.model.js";
import { deleteFromWasabi } from "../../services/wbUpload.service.js";

const toStr = (v) => (typeof v === "string" ? v.trim() : "");
const isValidUrl = (u) => typeof u === "string" && /^https?:\/\//i.test(u);

const DAY_MS = 24 * 60 * 60 * 1000;

// ✅ Admin: list all stories (newest)
export const adminGetAllStories = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const items = await Story.find({})
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .populate("userId", "name username avatar")
      .lean();

    return res.json({ ok: true, items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};

// ✅ Admin: list stories by user
export const adminGetStoriesByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.isValidObjectId(userId))
      return res.status(400).json({ ok: false, message: "Invalid userId" });

    const limit = Math.min(Number(req.query.limit) || 100, 300);

    const items = await Story.find({ userId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();

    return res.json({ ok: true, items, userId });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};

// ✅ Admin: delete story (soft delete) + optional wasabi delete
export const adminDeleteStory = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ ok: false, message: "Invalid id" });

    const story = await Story.findById(id);
    if (!story)
      return res.status(404).json({ ok: false, message: "Story not found" });

    if (!story.isDeleted) {
      story.isDeleted = true;
      await story.save();
    }

    // optional media delete
    const key = story?.media?.key;
    const provider = story?.media?.provider;
    if (key && provider === "wasabi") {
      await deleteFromWasabi(key).catch(() => {});
    }

    return res.json({ ok: true, message: "Story deleted", storyId: id });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Delete failed" });
  }
};

// ✅ Admin: restore story (soft deleted -> active)
export const adminRestoreStory = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ ok: false, message: "Invalid id" });

    const story = await Story.findByIdAndUpdate(
      id,
      { $set: { isDeleted: false } },
      { new: true },
    ).lean();

    if (!story)
      return res.status(404).json({ ok: false, message: "Story not found" });

    return res.json({ ok: true, message: "Story restored", story });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Restore failed" });
  }
};

// ✅ Admin: hard delete (remove from DB)
export const adminHardDeleteStory = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ ok: false, message: "Invalid id" });

    const story = await Story.findById(id).lean();
    if (!story)
      return res.status(404).json({ ok: false, message: "Story not found" });

    // delete media first
    const key = story?.media?.key;
    const provider = story?.media?.provider;
    if (key && provider === "wasabi") {
      await deleteFromWasabi(key).catch(() => {});
    }

    await Story.deleteOne({ _id: id });

    return res.json({ ok: true, message: "Story hard deleted", storyId: id });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Hard delete failed" });
  }
};

// ✅ Admin: create story for any user (optional)
export const adminCreateStory = async (req, res) => {
  try {
    const userId = req.body?.userId;
    if (!mongoose.isValidObjectId(userId))
      return res.status(400).json({ ok: false, message: "Invalid userId" });

    const { type, privacy, media, text, backgroundUrl, textStyle } =
      req.body || {};
    const storyType = ["image", "video", "text"].includes(type) ? type : null;
    if (!storyType)
      return res.status(400).json({ ok: false, message: "Invalid story type" });

    const safePrivacy = ["public", "friends", "only_me"].includes(privacy)
      ? privacy
      : "public";

    const expiresAt =
      req.body?.expiresAt && !Number.isNaN(Date.parse(req.body.expiresAt))
        ? new Date(req.body.expiresAt)
        : new Date(Date.now() + DAY_MS);

    let doc = {
      userId: new mongoose.Types.ObjectId(userId),
      type: storyType,
      privacy: safePrivacy,
      expiresAt,
      isDeleted: false,
      media: null,
      text: "",
      backgroundUrl: "",
      textStyle: null,
    };

    if (storyType === "text") {
      const cleanText = toStr(text);
      if (!cleanText)
        return res
          .status(400)
          .json({ ok: false, message: "Text story needs text" });
      doc.text = cleanText;
      doc.backgroundUrl = isValidUrl(backgroundUrl) ? backgroundUrl : "";
      doc.textStyle = textStyle || null;
    } else {
      const url = toStr(media?.url);
      if (!isValidUrl(url))
        return res
          .status(400)
          .json({ ok: false, message: "Media url invalid" });

      doc.media = {
        url,
        key: toStr(media?.key),
        provider: toStr(media?.provider) || "wasabi",
        thumbnailUrl: toStr(media?.thumbnailUrl),
        width: Number.isFinite(Number(media?.width))
          ? Number(media.width)
          : undefined,
        height: Number.isFinite(Number(media?.height))
          ? Number(media.height)
          : undefined,
        durationSec: Number.isFinite(Number(media?.durationSec))
          ? Number(media.durationSec)
          : undefined,
      };
    }

    const created = await Story.create(doc);
    return res.json({ ok: true, story: created });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Create failed" });
  }
};
