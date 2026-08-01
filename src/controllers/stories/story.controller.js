import mongoose from "mongoose";

import { deleteFromWasabi } from "../../services/wbUpload.service.js";
import Story from "../../models/stories/story.model.js";
import Follow from "../../models/follow/follow.model.js";
import StoryView from "../../models/stories/storyView.model.js";
import StoryReaction from "../../models/stories/storyReaction.model.js";

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

    const { type, privacy, media, text, backgroundUrl, textStyle, webLink } =
      req.body || {};
    const storyType = ["image", "video", "text"].includes(type) ? type : null;
    if (!storyType)
      return res.status(400).json({ message: "Invalid story type" });

    const safePrivacy = ["followers", "friends", "only_me"].includes(privacy)
      ? privacy
      : "followers";

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
      webLink: webLink,
    };

    if (storyType === "text") {
      const cleanText = toStr(text);
      if (!cleanText)
        return res.status(400).json({ message: "Text story needs text" });
      doc.text = cleanText;
      doc.backgroundUrl = isValidUrl(backgroundUrl) ? backgroundUrl : "";
      doc.textStyle = textStyle || null;
      doc.webLink = webLink || null;
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

// GET specipic USER STORIES
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

    const now = new Date();

    const match = {
      userId: new mongoose.Types.ObjectId(ownerId),
      isDeleted: false,
      expiresAt: { $gt: now },

      ...(isMe
        ? {}
        : {
            privacy: "followers",
          }),
    };

    const items = await Story.find(match).sort({ createdAt: 1, _id: 1 }).lean();

    const storyIds = items.map((item) => item._id);

    const viewCounts = await StoryView.aggregate([
      {
        $match: {
          storyId: { $in: storyIds },
        },
      },
      {
        $group: {
          _id: "$storyId",
          count: { $sum: 1 },
        },
      },
    ]);
    const reactions = await StoryReaction.find({
      storyId: { $in: storyIds },
    })
      .select("storyId userId reaction")
      .lean();

    const reactionMap = new Map();
    const myReactionMap = new Map();

    for (const r of reactions) {
      const key = String(r.storyId);

      if (!reactionMap.has(key)) {
        reactionMap.set(key, {
          total: 0,
          reactions: {},
        });
      }

      const item = reactionMap.get(key);

      item.total += 1;
      item.reactions[r.reaction] = (item.reactions[r.reaction] || 0) + 1;

      if (String(r.userId) === String(me)) {
        myReactionMap.set(key, r.reaction);
      }
    }

    const countMap = new Map(viewCounts.map((v) => [String(v._id), v.count]));

    const result = items.map((item) => {
      const id = String(item._id);

      const reactionInfo = reactionMap.get(id);

      return {
        ...item,

        viewCount: countMap.get(id) || 0,

        reactionCount: reactionInfo?.total || 0,

        reactions: reactionInfo?.reactions || {},

        myReaction: myReactionMap.get(id) || null,
      };
    });

    return res.json({ success: true, items: result, ownerId, isMe });
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

    await StoryView.updateOne(
      {
        storyId: story._id,
        viewerId: me,
      },
      {
        $set: {
          updatedAt: new Date(),
        },
        $setOnInsert: {
          storyId: story._id,
          ownerId: story.userId, // ✅ add
          viewerId: me,
        },
      },
      {
        upsert: true,
      },
    );
    // console.log("story view", res);

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Mark seen failed" });
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

    const { followingIds } = await getMutualIds(me);

    const now = new Date();
    const meObjId = new mongoose.Types.ObjectId(me);

    // ✅ allowed owners (me + following)
    const ownerIds = [String(me), ...followingIds];
    const ownerObjIds = ownerIds
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
            // নিজের story
            { userId: meObjId },

            // যাদের follow করি তাদের followers story
            {
              privacy: "followers",
              userId: { $in: ownerObjIds },
            },

            // শুধু নিজের only_me story
            {
              privacy: "only_me",
              userId: meObjId,
            },
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
          from: "storyviews",
          let: {
            ownerId: "$ownerId",
          },

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
            {
              $sort: {
                updatedAt: -1,
              },
            },
            {
              $limit: 1,
            },
          ],
          as: "seen",
        },
      },
     
      {
        $addFields: {
          seenAt: {
            $arrayElemAt: ["$seen.updatedAt", 0],
          },
        },
      },
      {
        $addFields: {
          isSeen: {
            $and: [
              { $ne: ["$ownerId", meObjId] },
              { $ne: ["$seenAt", null] },
              { $gte: ["$seenAt", "$lastItemAt"] },
            ],
          },
          isMe: {
            $eq: ["$ownerId", meObjId],
          },
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
    // console.log("rows", rows);

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

export const getStoryViewers = async (req, res) => {
  try {
    const me = req.user?._id;
    const storyId = req.params.id;
    if (!me) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.isValidObjectId(storyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid story id",
      });
    }

    // Story exists?
    const story = await Story.findById(storyId).select("_id userId").lean();

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Only story owner can see viewers
    if (String(story.userId) !== String(me)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    const [totalViews, viewers] = await Promise.all([
      StoryView.countDocuments({ storyId }),

      StoryView.find({ storyId })
        .populate({
          path: "viewerId",
          select: "_id name username avatar verified",
        })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return res.json({
      success: true,
      totalViews,
      viewers,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Failed to fetch story viewers",
    });
  }
};

// reaction

export const reactToStory = async (req, res) => {
  try {
    const me = req.user?._id;
    const storyId = req.params.id;
    const { reaction } = req.body;

    if (!me) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.isValidObjectId(storyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid story id",
      });
    }

    const allowedReactions = [
      "like",
      "love",
      "haha",
      "wow",
      "sad",
      "angry",
      "fire",
    ];

    if (!allowedReactions.includes(reaction)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reaction",
      });
    }

    const story = await Story.findById(storyId).select("_id").lean();

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    await StoryReaction.updateOne(
      {
        storyId,
        userId: me,
      },
      {
        $set: {
          reaction,
        },
      },
      {
        upsert: true,
      },
    );

    return res.json({
      success: true,
      message: "Reaction updated",
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Reaction failed",
    });
  }
};
