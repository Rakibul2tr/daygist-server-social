import mongoose from "mongoose";
import Follow from "../../models/follow/follow.model.js";
import User from "../../models/user/user.model.js";
import { buildCursorFilter, parseCursor } from "../../utils/cursor.js";

const toId = (v) => String(v || "");
const toOID = (id) => new mongoose.Types.ObjectId(id);

export const followUser = async (req, res) => {
  try {
    const me = req.user?._id;
    const targetId = req.params.userId;

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.isValidObjectId(targetId))
      return res.status(400).json({ message: "Invalid userId" });
    if (toId(me) === toId(targetId))
      return res.status(400).json({ message: "You cannot follow yourself" });

    // target exists?
    const target = await User.findById(targetId).select("_id");
    if (!target) return res.status(404).json({ message: "User not found" });

    // upsert follow (duplicate safe)
    const r = await Follow.updateOne(
      { follower: me, following: targetId },
      { $setOnInsert: { follower: me, following: targetId } },
      { upsert: true }
    );

    // নতুন করে follow হলে counters বাড়াবে
    if (r.upsertedCount === 1) {
      await User.updateOne({ _id: me }, { $inc: { followingCount: 1 } });
      await User.updateOne({ _id: targetId }, { $inc: { followerCount: 1 } });
    }

    return res.json({ success: true, followed: true });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Follow failed" });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    const me = req.user?._id;
    const targetId = req.params.userId;

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.isValidObjectId(targetId))
      return res.status(400).json({ message: "Invalid userId" });
    if (toId(me) === toId(targetId))
      return res.status(400).json({ message: "Invalid operation" });

    const r = await Follow.deleteOne({ follower: me, following: targetId });

    // সত্যি সত্যি unfollow হলে counters কমাবে
    if (r.deletedCount === 1) {
      await User.updateOne({ _id: me }, { $inc: { followingCount: -1 } });
      await User.updateOne({ _id: targetId }, { $inc: { followerCount: -1 } });
    }

    return res.json({ success: true, followed: false });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Unfollow failed" });
  }
};

/**
 * ✅ GET /users/:id/followers
 * followers = যারা :id user কে follow করে
 */
export const getFollowers = async (req, res) => {
    // console.log("followers param:", req.params);

  try {
    const me = req.user?._id; // optional (guest হলে null থাকতে পারে)
     const userId = req.params.userId || req.params.id;

    if (!mongoose.isValidObjectId(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid userId" });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const q = String(req.query.q || "").trim();
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    // ✅ ensure user exists (cheap)
    const exists = await User.findById(userId).select("_id").lean();
    if (!exists)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // followers list
    // Follow doc: follower -> person, following -> target userId
    const baseMatch = {
      following: toOID(userId),
      ...cursorFilter,
    };

    const pipeline = [
      { $match: baseMatch },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: limit },

      // join follower user
      {
        $lookup: {
          from: "users",
          localField: "follower",
          foreignField: "_id",
          as: "u",
        },
      },
      { $unwind: "$u" },
    ];

    // optional search by name/username
    if (q) {
      pipeline.push({
        $match: {
          $or: [
            { "u.name": { $regex: q, $options: "i" } },
            { "u.username": { $regex: q, $options: "i" } },
          ],
        },
      });
    }

    // ✅ compute isFollowing (me follows this follower user?)
    // me -> following = u._id
    if (me) {
      pipeline.push(
        {
          $lookup: {
            from: "follows",
            let: { personId: "$u._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$follower", toOID(me)] },
                      { $eq: ["$following", "$$personId"] },
                    ],
                  },
                },
              },
              { $project: { _id: 1 } },
              { $limit: 1 },
            ],
            as: "meRel",
          },
        },
        {
          $addFields: {
            isFollowing: { $gt: [{ $size: "$meRel" }, 0] },
          },
        },
      );
    } else {
      pipeline.push({ $addFields: { isFollowing: false } });
    }

    pipeline.push({
      $project: {
        _id: "$u._id",
        name: "$u.name",
        username: "$u.username",
        avatarUrl: "$u.avatarUrl",
        avatarKey: "$u.avatarKey",
        provider: { $ifNull: ["$u.avatarProvider", "wasabi"] },
        isFollowing: 1,
        // cursor fields
        createdAt: 1,
      },
    });

    const items = await Follow.aggregate(pipeline);

    const nextCursor =
      items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            _id: items[items.length - 1]._id,
          }
        : null;

    return res.json({ success: true, items, nextCursor });
  } catch (e) {
    return res
      .status(500)
      .json({
        success: false,
        message: e?.message || "Followers fetch failed",
      });
  }
};

/**
 * ✅ GET /users/:id/following
 * following = :id user যাদের follow করে
 */
export const getFollowing = async (req, res) => {
    // console.log("following param:", req.params);

  try {
    const me = req.user?._id; // optional
     const userId = req.params.userId || req.params.id;

    if (!mongoose.isValidObjectId(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid userId" });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const q = String(req.query.q || "").trim();
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const exists = await User.findById(userId).select("_id").lean();
    if (!exists)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const baseMatch = {
      follower: toOID(userId),
      ...cursorFilter,
    };

    const pipeline = [
      { $match: baseMatch },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: limit },

      // join following user
      {
        $lookup: {
          from: "users",
          localField: "following",
          foreignField: "_id",
          as: "u",
        },
      },
      { $unwind: "$u" },
    ];

    if (q) {
      pipeline.push({
        $match: {
          $or: [
            { "u.name": { $regex: q, $options: "i" } },
            { "u.username": { $regex: q, $options: "i" } },
          ],
        },
      });
    }

    // if viewing someone else list -> show if ME follows that user
    if (me) {
      pipeline.push(
        {
          $lookup: {
            from: "follows",
            let: { personId: "$u._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$follower", toOID(me)] },
                      { $eq: ["$following", "$$personId"] },
                    ],
                  },
                },
              },
              { $project: { _id: 1 } },
              { $limit: 1 },
            ],
            as: "meRel",
          },
        },
        {
          $addFields: {
            isFollowing: { $gt: [{ $size: "$meRel" }, 0] },
          },
        },
      );
    } else {
      pipeline.push({ $addFields: { isFollowing: false } });
    }

    pipeline.push({
      $project: {
        _id: "$u._id",
        name: "$u.name",
        username: "$u.username",
        avatarUrl: "$u.avatarUrl",
        avatarKey: "$u.avatarKey",
        provider: { $ifNull: ["$u.avatarProvider", "wasabi"] },
        isFollowing: 1,
        createdAt: 1,
      },
    });

    const items = await Follow.aggregate(pipeline);

    const nextCursor =
      items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            _id: items[items.length - 1]._id,
          }
        : null;

    return res.json({ success: true, items, nextCursor });
  } catch (e) {
    return res
      .status(500)
      .json({
        success: false,
        message: e?.message || "Following fetch failed",
      });
  }
};


export const followStatus = async (req, res) => {
  try {
    const me = req.user?._id;
    const targetId = req.params.userId || req.params.id;

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.isValidObjectId(targetId))
      return res.status(400).json({ message: "Invalid userId" });

    const exists = await Follow.exists({ follower: me, following: targetId });
    return res.json({ success: true, followed: !!exists });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Status failed" });
  }
};
