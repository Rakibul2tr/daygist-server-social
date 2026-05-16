// src/services/feed/getHomeFeed.js
import mongoose from "mongoose";

import Post from "../../models/post/post.model.js";
import Follow from "../../models/follow/follow.model.js";
import PostLike from "../../models/post/postLike.model.js";
import PostShare from "../../models/post/postShare.model.js";

import Group from "../../models/group/group.model.js";
import GroupMember from "../../models/group/groupMember.model.js";
import GroupPost from "../../models/group/groupPost.model.js";
import GroupPostShare from "../../models/group/groupPostShare.model.js";
import GroupPostLike from "../../models/group/groupPostLike.model.js";
import Save from "../../models/post/save.model.js";

const toOID = (id) => new mongoose.Types.ObjectId(id);

/* ---------------------- CURSOR FILTER ---------------------- */
const buildCursorFilter = (cursor) => {
  if (!cursor?.createdAt || !cursor?._id) return null;

  return {
    $or: [
      { createdAt: { $lt: new Date(cursor.createdAt) } },
      {
        createdAt: new Date(cursor.createdAt),
        _id: { $lt: new mongoose.Types.ObjectId(cursor._id) },
      },
    ],
  };
};

/* ---------------------- GROUP ACCESS ---------------------- */
async function getAllowedGroupIds(meObjId) {
  const [memberGroupIds, createdGroupIds] = await Promise.all([
    GroupMember.distinct("groupId", {
      userId: meObjId,
      status: "active",
    }),
    Group.distinct("_id", {
      createdBy: meObjId,
      isDeleted: { $ne: true },
    }),
  ]);

  const set = new Set(
    [...memberGroupIds, ...createdGroupIds].map((x) => String(x)),
  );

  return Array.from(set).map((id) => toOID(id));
}

/* ---------------------- MAIN FEED ---------------------- */
export async function getHomeFeed({ userId, limit = 20, cursor }) {
  const take = Math.min(Number(limit) || 20, 50);
  const overFetch = Math.min(take * 2, 80);
  const cursorFilter = buildCursorFilter(cursor);

  /* ---------------------- FOLLOWING ---------------------- */
  const followingDocs = userId
    ? await Follow.find({ follower: userId }).select("following").lean()
    : [];

  const followingIds = followingDocs.map((f) => f.following);

  /* ---------------------- POSTS (MAIN SOURCE) ---------------------- */
  const postPipeline = [
    { $match: { isDeleted: false } },

    { $sort: { createdAt: -1, _id: -1 } },

    ...(cursorFilter ? [{ $match: cursorFilter }] : []),

    { $limit: overFetch },

    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
      },
    },
    { $unwind: "$author" },

    {
      $lookup: {
        from: "posts",
        localField: "sharedPostId",
        foreignField: "_id",
        as: "sharedPost",
      },
    },
    {
      $unwind: {
        path: "$sharedPost",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "sharedPost.author",
        foreignField: "_id",
        as: "sharedPost.author",
      },
    },
    {
      $unwind: {
        path: "$sharedPost.author",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: "groups",
        localField: "sharedPostId.groupId",
        foreignField: "_id",
        as: "sharedPostId.groupId",
      },
    },
    {
      $unwind: {
        path: "$sharedPostId.groupId",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        feedType: "post",
        "author.isMe": userId
          ? { $eq: ["$author._id", new mongoose.Types.ObjectId(userId)] }
          : false,
        isFollowingAuthor: userId
          ? { $in: ["$author._id", followingIds] }
          : false,
        isRePost: {
          $ifNull: ["$isRePost", false],
        },
      },
    },
  ];

  const postItems = await Post.aggregate(postPipeline);

  /* ---------------------- GROUP POSTS (LIMITED MIX) ---------------------- */
  let groupItems = [];

  if (userId) {
    const meObjId = toOID(userId);
    const allowedGroupIds = await getAllowedGroupIds(meObjId);

    if (allowedGroupIds.length) {
      const groupPipeline = [
        {
          $match: {
            groupId: { $in: allowedGroupIds },
            isDeleted: { $ne: true },
          },
        },

        { $sort: { createdAt: -1, _id: -1 } },

        ...(cursorFilter ? [{ $match: cursorFilter }] : []),

        { $limit: Math.floor(overFetch / 2) }, // 🔥 limit group posts

        {
          $lookup: {
            from: "groups",
            localField: "groupId",
            foreignField: "_id",
            as: "group",
          },
        },
        { $unwind: "$group" },

        {
          $lookup: {
            from: "users",
            localField: "authorId",
            foreignField: "_id",
            as: "author",
          },
        },
        { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },

        {
          $addFields: {
            feedType: "groupPost",
            isLiked: false,
            isShared: false,
          },
        },
      ];

      groupItems = await GroupPost.aggregate(groupPipeline);
    }
  }

  /* ---------------------- PAGINATION FIX ---------------------- */
  const basePosts = postItems.slice(0, take); // 🔥 main pagination source

  const groupLimited = groupItems.slice(0, Math.floor(take / 3));

  const mixed = [...basePosts, ...groupLimited].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (ta !== tb) return tb - ta;
    return String(b._id).localeCompare(String(a._id));
  });

  const sliced = mixed.slice(0, take);

  /* ---------------------- LIKE/SHARE ---------------------- */
  if (userId && sliced.length > 0) {
    const postIds = sliced
      .filter((x) => x.feedType === "post")
      .map((p) => p._id);

    const groupPostIds = sliced
      .filter((x) => x.feedType === "groupPost")
      .map((p) => p._id);

    const [likedRows, sharedRows, gLikedRows, gSharedRows, savedRows] =
      await Promise.all([
        PostLike.find({ user: userId, post: { $in: postIds } })
          .select("post")
          .lean(),

        PostShare.find({ user: userId, post: { $in: postIds } })
          .select("post")
          .lean(),

        GroupPostLike.find({
          userId: userId,
          postId: { $in: groupPostIds },
        })
          .select("postId")
          .lean(),

        GroupPostShare.find({
          userId: userId,
          postId: { $in: groupPostIds },
        })
          .select("postId")
          .lean(),

        // ✅ ONLY POST SAVE (correct)
        Save.find({
          user: userId,
          $or: [
            { targetId: { $in: postIds }, targetType: "post" },
            { targetId: { $in: groupPostIds }, targetType: "groupPost" },
          ],
        })
          .select("targetId targetType")
          .lean(),
      ]);

    const likedSet = new Set(likedRows.map((r) => String(r.post)));
    const sharedSet = new Set(sharedRows.map((r) => String(r.post)));

    const gLikedSet = new Set(gLikedRows.map((r) => String(r.postId)));
    const gSharedSet = new Set(gSharedRows.map((r) => String(r.postId)));

    const savedPostSet = new Set(
      savedRows
        .filter((r) => r.targetType === "post")
        .map((r) => String(r.targetId)),
    );

    const savedGroupSet = new Set(
      savedRows
        .filter((r) => r.targetType === "groupPost")
        .map((r) => String(r.targetId)),
    );

    for (const it of sliced) {
      const id = String(it._id);

      if (it.feedType === "post") {
        it.isLiked = likedSet.has(id);
        it.isShared = sharedSet.has(id);

        // ✅ SAVE
        it.isSave = savedPostSet.has(id);
      } else {
        it.isLiked = gLikedSet.has(id);
        it.isShared = gSharedSet.has(id);

        it.isSave = savedGroupSet.has(id);
      }
    }
  }

  /* ---------------------- FINAL RESPONSE ---------------------- */
  const items = sliced.map((x) => ({
    feedType: x.feedType,
    data: x,
  }));

  // 🔥 cursor ONLY from basePosts
  const last = basePosts[basePosts.length - 1];

  const nextCursor = last
    ? {
        createdAt: last.createdAt,
        _id: last._id,
      }
    : null;

  return { items, nextCursor };
}
