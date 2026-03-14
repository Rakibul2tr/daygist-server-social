
import mongoose from "mongoose";
import Report from "../../models/report/reportPost.model.js";
import Post from "../../models/post/post.model.js"; // তোমার Post model path ঠিক করো

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export async function createPostReport(req, res) {
  const reporterId = req.user?.id; // requireAuth middleware থেকে
  const { postId } = req.params;
  const { reason, details } = req.body || {};

  if (!isObjectId(postId)) return res.status(400).json({ ok: false, message: "Invalid postId" });
  if (!reason) return res.status(400).json({ ok: false, message: "reason is required" });

  const post = await Post.findById(postId).select("_id author").lean();
  if (!post) return res.status(404).json({ ok: false, message: "Post not found" });

  try {
    const doc = await Report.create({
      targetType: "post",
      targetId: post._id,
      reporter: reporterId,
      reason,
      details: String(details || "").slice(0, 1000),
      targetOwner: post.author,
    });

    return res.json({ ok: true, report: doc });
  } catch (e) {
    // unique index hit => already reported
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Already reported" });
    }
    return res.status(500).json({ ok: false, message: "Report failed" });
  }
}

export async function myReports(req, res) {
  const reporterId = req.user?.id;

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Report.find({ reporter: reporterId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments({ reporter: reporterId }),
  ]);

  res.json({ ok: true, items, total, page, limit });
}

// ---------------- ADMIN ----------------

export async function adminListReports(req, res) {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;

  const status = String(req.query.status || "");
  const reason = String(req.query.reason || "");
  const q = String(req.query.q || ""); // search

  const filter = {};
  if (status) filter.status = status;
  if (reason) filter.reason = reason;

  // optional filters
  const targetId = String(req.query.targetId || "");
  if (targetId && isObjectId(targetId)) filter.targetId = targetId;

  const reporter = String(req.query.reporter || "");
  if (reporter && isObjectId(reporter)) filter.reporter = reporter;

  if (q) {
    // simple text filter
    filter.$or = [
      { details: { $regex: q, $options: "i" } },
      { adminNote: { $regex: q, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("reporter", "fullname regNumber profilePic")
      .populate("resolvedBy", "fullname regNumber")
      .lean(),
    Report.countDocuments(filter),
  ]);

  res.json({ ok: true, items, total, page, limit });
}

export async function adminGetReport(req, res) {
  const { id } = req.params;
  if (!isObjectId(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

  const doc = await Report.findById(id)
    .populate("reporter", "fullname regNumber profilePic")
    .populate("resolvedBy", "fullname regNumber")
    .lean();

  if (!doc) return res.status(404).json({ ok: false, message: "Not found" });
  res.json({ ok: true, report: doc });
}

export async function adminUpdateReport(req, res) {
  const adminId = req.user?.id;
  const { id } = req.params;
  if (!isObjectId(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

  const { status, adminNote } = req.body || {};
  const patch = {};

  if (status) patch.status = status;
  if (adminNote !== undefined) patch.adminNote = String(adminNote || "").slice(0, 2000);

  // if resolved/rejected => set resolver info
  if (status === "resolved" || status === "rejected") {
    patch.resolvedBy = adminId;
    patch.resolvedAt = new Date();
  }

  const updated = await Report.findByIdAndUpdate(id, patch, { new: true }).lean();
  if (!updated) return res.status(404).json({ ok: false, message: "Not found" });

  res.json({ ok: true, report: updated });
}

export async function adminDeleteReport(req, res) {
  const { id } = req.params;
  if (!isObjectId(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

  const deleted = await Report.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });

  res.json({ ok: true });
}
