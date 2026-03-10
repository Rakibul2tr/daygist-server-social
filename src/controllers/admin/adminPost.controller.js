// FILE: src/controllers/admin/adminPost.controller.js
import Post from "../../models/post/post.model.js";

// ✅ Admin: All posts (newest first)
export const adminGetAllPosts = async (req, res) => {
  try {
    const posts = await Post.find({})
      .sort({ createdAt: -1, _id: -1 })
      .populate("author", "name username avatar profilePic uid isVerified")
      .lean();

    return res.json({ ok: true, data: posts });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};

// ✅ Admin: single post details
export const adminGetPostById = async (req, res) => {
  try {
    const postId = req.params?.id;
    const post = await Post.findById(postId)
      .populate("author", "name username avatar profilePic uid isVerified")
      .lean();

    if (!post)
      return res.status(404).json({ ok: false, message: "Post not found" });
    return res.json({ ok: true, data: post });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};

// ✅ Admin: edit post (safe fields only)
export const adminUpdatePost = async (req, res) => {
  try {
    const postId = req.params?.id;

    const allowed = [
      "text",
      "description",
      "privacy",
      "backgroundUrl",
      "textStyle",
      "layout",
      "medias",
      "mutedByDefault",
      "loop",
      "videoMode",
      "category",
      "subCategory",
      "type", // চাইলে remove করতে পারো (type change risky)
      "isDeleted", // restore করার জন্য
    ];

    const payload = {};
    for (const k of allowed) {
      if (req.body?.[k] !== undefined) payload[k] = req.body[k];
    }

    // ✅ basic sanitize
    if (payload.text != null) payload.text = String(payload.text).trim();
    if (payload.description != null)
      payload.description = String(payload.description).trim();
    if (payload.privacy != null) payload.privacy = String(payload.privacy);
    if (payload.type != null) payload.type = String(payload.type);
    if (payload.videoMode != null)
      payload.videoMode = String(payload.videoMode);
    if (payload.category != null) payload.category = String(payload.category);
    if (payload.subCategory != null)
      payload.subCategory = String(payload.subCategory);
    if (payload.layout != null)
      payload.layout = payload.layout ? String(payload.layout) : null;

    const updated = await Post.findByIdAndUpdate(
      postId,
      { $set: payload },
      { new: true },
    )
      .populate("author", "name username avatar profilePic uid isVerified")
      .lean();

    if (!updated)
      return res.status(404).json({ ok: false, message: "Post not found" });

    return res.json({ ok: true, message: "Post updated", data: updated });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Update failed" });
  }
};

// ✅ Admin: soft delete (recommended)
export const adminDeletePost = async (req, res) => {
  try {
    const postId = req.params?.id;

    const post = await Post.findByIdAndUpdate(
      postId,
      { $set: { isDeleted: true } },
      { new: true },
    ).lean();

    if (!post)
      return res.status(404).json({ ok: false, message: "Post not found" });

    return res.json({ ok: true, message: "Post deleted", data: post });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Delete failed" });
  }
};

// ✅ Admin: restore deleted post
export const adminRestorePost = async (req, res) => {
  try {
    const postId = req.params?.id;

    const post = await Post.findByIdAndUpdate(
      postId,
      { $set: { isDeleted: false } },
      { new: true },
    ).lean();

    if (!post)
      return res.status(404).json({ ok: false, message: "Post not found" });

    return res.json({ ok: true, message: "Post restored", data: post });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Restore failed" });
  }
};

// ✅ Optional: hard delete (DB থেকে পুরো remove)
// ⚠️ media delete (wasabi/cloudinary) handle করলে আলাদা util লাগবে
export const adminHardDeletePost = async (req, res) => {
  try {
    const postId = req.params?.id;
    const deleted = await Post.findByIdAndDelete(postId).lean();

    if (!deleted)
      return res.status(404).json({ ok: false, message: "Post not found" });

    return res.json({ ok: true, message: "Post hard deleted", data: deleted });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Hard delete failed" });
  }
};
