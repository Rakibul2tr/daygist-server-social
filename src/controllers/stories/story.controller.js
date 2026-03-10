import mongoose from "mongoose";

import { deleteFromWasabi } from "../../services/wbUpload.service.js";
import Story from "../../models/stories/story.model.js";
import Follow from "../../models/follow/follow.model.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const toStr = (v) => (typeof v === "string" ? v.trim() : "");
const isValidUrl = (u) => typeof u === "string" && /^https?:\/\//i.test(u);

const parseCursor = (raw) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// cursor = { lastItemAt, ownerId }
const buildCursorFilter = (cursor) => {
  if (!cursor?.lastItemAt || !cursor?.ownerId) return {};
  const dt = new Date(cursor.lastItemAt);
  const oid = new mongoose.Types.ObjectId(cursor.ownerId);
  return {
    $or: [
      { lastItemAt: { $lt: dt } },
      { lastItemAt: dt, ownerId: { $lt: oid } },
    ],
  };
};

// ✅ mutual ids for "friends"
async function getMutualIds(me) {
  const followingRows = await Follow.find({ follower: me })
    .select("following")
    .lean();
  const followerRows = await Follow.find({ following: me })
    .select("follower")
    .lean();

  const following = new Set(followingRows.map((x) => String(x.following)));
  const followers = new Set(followerRows.map((x) => String(x.follower)));

  const mutual = [];
  for (const id of following) if (followers.has(id)) mutual.push(id);

  return {
    followingIds: followingRows.map((x) => String(x.following)),
    mutualIds: mutual,
  };
}

// CREATE STORY
export const createStory = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const { type, privacy, media, text, backgroundUrl, textStyle } =
      req.body || {};
    const storyType = ["image", "video", "text"].includes(type) ? type : null;
    if (!storyType)
      return res.status(400).json({ message: "Invalid story type" });

    const safePrivacy = ["public", "friends", "only_me"].includes(privacy)
      ? privacy
      : "public";

    const expiresAt = new Date(Date.now() + DAY_MS);

    let doc = {
      userId: me,
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
        return res.status(400).json({ message: "Text story needs text" });
      doc.text = cleanText;
      doc.backgroundUrl = isValidUrl(backgroundUrl) ? backgroundUrl : "";
      doc.textStyle = textStyle || null;
    } else {
      const url = toStr(media?.url);
      if (!isValidUrl(url))
        return res.status(400).json({ message: "Media url invalid" });

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
    

    return res.json({ success: true, story: created });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Create story failed" });
  }
};

// GET USER STORIES
export const getUserStories = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const userIdRaw = String(req.params.userId || "");
    const ownerId = userIdRaw === "me" ? String(me) : userIdRaw;

    if (!mongoose.isValidObjectId(ownerId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    // privacy rules
    const isMe = String(me) === String(ownerId);

    // mutual needed for friends
    let mutualIds = [];
    if (!isMe) {
      const mutual = await getMutualIds(me);
      mutualIds = mutual.mutualIds;
    }

    const now = new Date();

    const match = {
      userId: new mongoose.Types.ObjectId(ownerId),
      isDeleted: false,
      expiresAt: { $gt: now },
      ...(isMe
        ? {}
        : {
            $or: [
              { privacy: "public" },
              {
                privacy: "friends",
                userId: {
                  $in: mutualIds.map((id) => new mongoose.Types.ObjectId(id)),
                },
              },
            ],
          }),
    };

    // ⚠️ friends filter: simplest way -> if not mutual => only public will pass
    // above $or includes friends only if mutualIds contains owner; else it's false

    const items = await Story.find(match).sort({ createdAt: 1, _id: 1 }).lean();

    return res.json({ success: true, items, ownerId, isMe });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Fetch stories failed" });
  }
};

// MARK STORY SEEN
export const markStorySeen = async (req, res) => {
  try {
    const me = req.user?._id;
    const storyId = req.params.id;

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.isValidObjectId(storyId)) {
      return res.status(400).json({ message: "Invalid story id" });
    }

    const story = await Story.findById(storyId)
      .select("_id userId createdAt")
      .lean();
    if (!story) return res.status(404).json({ message: "Story not found" });

    // don't mark own as seen (optional)
    if (String(story.userId) === String(me)) {
      return res.json({ success: true, message: "Owner view ignored" });
    }

    await StorySeen.updateOne(
      { viewerId: me, ownerId: story.userId },
      {
        $set: {
          lastSeenAt: story.createdAt,
          lastStoryId: story._id,
        },
      },
      { upsert: true }
    );

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Mark seen failed" });
  }
};

// DELETE STORY
export const deleteStory = async (req, res) => {
  try {
    const me = req.user?._id;
    const id = req.params.id;

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "Invalid id" });

    const story = await Story.findById(id);
    if (!story || story.isDeleted)
      return res.status(404).json({ message: "Story not found" });

    if (String(story.userId) !== String(me)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // ✅ soft delete (or hard delete)
    story.isDeleted = true;
    await story.save();

    // ✅ OPTIONAL: delete media from Wasabi (only if key exists)
    const key = story?.media?.key;
    const provider = story?.media?.provider;
    if (key && provider === "wasabi") {
      await deleteFromWasabi(key).catch(() => {});
    }

    return res.json({ success: true });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Delete story failed" });
  }
};

// GET STORY FEED
export const getStoryFeed = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const take = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const { followingIds, mutualIds } = await getMutualIds(me);

    const now = new Date();
    const meObjId = new mongoose.Types.ObjectId(me);

    // ✅ allowed owners (me + following)
    const ownerIds = [String(me), ...followingIds];
    const ownerObjIds = ownerIds
      .filter(mongoose.isValidObjectId)
      .map((id) => new mongoose.Types.ObjectId(id));

    // ✅ friends visible list (mutual only)
    const mutualObjIds = mutualIds
      .filter(mongoose.isValidObjectId)
      .map((id) => new mongoose.Types.ObjectId(id));

    const rows = await Story.aggregate([
      {
        $match: {
          isDeleted: false,
          expiresAt: { $gt: now },
          userId: { $in: ownerObjIds },
          // privacy filter (viewer != owner)
          $or: [
            { userId: meObjId }, // owner sees all
            { privacy: "public" },
            { privacy: "friends", userId: { $in: mutualObjIds } },
          ],
        },
      },

      // latest first
      { $sort: { createdAt: -1, _id: -1 } },

      // group by owner
      {
        $group: {
          _id: "$userId",
          ownerId: { $first: "$userId" },
          lastItemAt: { $first: "$createdAt" },
          lastStory: { $first: "$$ROOT" },
          count: { $sum: 1 },
        },
      },

      // apply cursor after grouping
      { $match: { ...cursorFilter } },

      { $sort: { lastItemAt: -1, ownerId: -1 } },
      { $limit: take },

      // join user
      {
        $lookup: {
          from: "users",
          localField: "ownerId",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $unwind: "$owner" },

      // join seen table
      {
        $lookup: {
          from: "storyseens",
          let: { ownerId: "$ownerId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$viewerId", meObjId] },
                    { $eq: ["$ownerId", "$$ownerId"] },
                  ],
                },
              },
            },
            { $project: { _id: 0, lastSeenAt: 1 } },
          ],
          as: "seen",
        },
      },
      {
        $addFields: {
          seenAt: {
            $ifNull: [{ $arrayElemAt: ["$seen.lastSeenAt", 0] }, null],
          },
          isSeen: {
            $cond: [
              {
                $and: [
                  { $ne: ["$ownerId", meObjId] },
                  { $ne: ["$seenAt", null] },
                  { $gte: ["$seenAt", "$lastItemAt"] },
                ],
              },
              true,
              false,
            ],
          },
          isMe: { $eq: ["$ownerId", meObjId] },
        },
      },

      {
        $project: {
          ownerId: 1,
          lastItemAt: 1,
          count: 1,
          isSeen: 1,
          isMe: 1,
          owner: {
            _id: "$owner._id",
            name: "$owner.name",
            username: "$owner.username",
            avatar: "$owner.avatar",
          },
          lastStory: {
            _id: "$lastStory._id",
            type: "$lastStory.type",
            privacy: "$lastStory.privacy",
            media: "$lastStory.media",
            text: "$lastStory.text",
            createdAt: "$lastStory.createdAt",
          },
        },
      },

      // unseen first (except me)
      { $sort: { isMe: -1, isSeen: 1, lastItemAt: -1 } },
    ]);

    const nextCursor =
      rows.length > 0
        ? {
            lastItemAt: rows[rows.length - 1].lastItemAt,
            ownerId: rows[rows.length - 1].ownerId,
          }
        : null;

    return res.json({ success: true, items: rows, nextCursor });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Story feed failed" });
  }
};
