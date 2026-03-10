


import mongoose from "mongoose";
import Notification from "../../models/notification/notification.model.js";
import { parseCursor, buildCursorFilter } from "../../utils/cursor.js";

// ✅ GET /notifications?limit=20&cursor=...
export const getNotifications = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const items = await Notification.find({
      toUserId: new mongoose.Types.ObjectId(me),
      ...cursorFilter,
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();

    const nextCursor =
      items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            _id: items[items.length - 1]._id,
          }
        : null;

    return res.json({ ok: true, items, nextCursor });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};

// ✅ POST /notifications/:id/read
export const markNotificationSeen = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const id = req.params?.id;
    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ ok: false, message: "Invalid notification id" });
    }

    const r = await Notification.updateOne(
      { _id: id, toUserId: me, isRead: { $ne: true } },
      { $set: { isRead: true, readAt: new Date() } },
    );

    return res.json({ ok: true, modified: r?.modifiedCount || 0 });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};

// ✅ POST /notifications/mark-all-read
export const markAllSeen = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const r = await Notification.updateMany(
      { toUserId: me, isRead: { $ne: true } },
      { $set: { isRead: true, readAt: new Date() } },
    );

    return res.json({ ok: true, modified: r?.modifiedCount || 0 });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};
