
// // src/services/feed/getHomeFeed.js
// import mongoose from "mongoose";

// import Post from "../../models/post/post.model.js";
// import Follow from "../../models/follow/follow.model.js";
// import PostLike from "../../models/post/postLike.model.js";
// import PostShare from "../../models/post/postShare.model.js";

// // ✅ group imports
// import Group from "../../models/group/group.model.js";
// import GroupMember from "../../models/group/groupMember.model.js";
// import GroupPost from "../../models/group/groupPost.model.js";
// import GroupPostShare from "../../models/group/groupPostShare.model.js";
// import GroupPostLike from "../../models/group/groupPostLike.model.js";

// const toOID = (id) => new mongoose.Types.ObjectId(id);

// // cursor = { createdAt, _id }
// const buildCursorFilter = (cursor) => {
//   if (!cursor?.createdAt || !cursor?._id) return {};
//   return {
//     $or: [
//       { createdAt: { $lt: new Date(cursor.createdAt) } },
//       {
//         createdAt: new Date(cursor.createdAt),
//         _id: { $lt: new mongoose.Types.ObjectId(cursor._id) },
//       },
//     ],
//   };
// };

// // ✅ user allowed group ids = (active member) + (created by me)
// async function getAllowedGroupIds(meObjId) {
//   const [memberGroupIds, createdGroupIds] = await Promise.all([
//     GroupMember.distinct("groupId", {
//       userId: meObjId,
//       status: "active",
//     }),
//     Group.distinct("_id", {
//       createdBy: meObjId,
//       isDeleted: { $ne: true },
//     }),
//   ]);

//   const set = new Set(
//     [...memberGroupIds, ...createdGroupIds].map((x) => String(x)),
//   );

//   return Array.from(set).map((id) => toOID(id));
// }

// export async function getHomeFeed({ userId, limit = 20, cursor }) {
//   const take = Math.min(Number(limit) || 20, 50);
//   const cursorFilter = buildCursorFilter(cursor);

//   // ✅ overfetch (merge করার পরে slice করবো)
//   const overFetch = Math.min(take * 2, 80);

//   // ✅ user follows list
//   const followingDocs = userId
//     ? await Follow.find({ follower: userId }).select("following").lean()
//     : [];

//   const followingIds = followingDocs.map((f) => f.following); // ObjectId[]
//   console.log("followingIds", followingIds);
  

//   /* ------------------------------------------------------------------ */
//   /* 1) NORMAL POSTS (your existing feed, keep it as-is)                 */
//   /* ------------------------------------------------------------------ */
//   const postItems = await Post.aggregate([
//     { $match: { isDeleted: false, ...cursorFilter } },

//     {
//       $addFields: {
//         feedType: "post", // ✅ mark type
//       },
//     },

//     // ✅ chronological only (FB mix base)
//     { $sort: { createdAt: -1, _id: -1 } },

//     { $limit: overFetch },

//     {
//       $lookup: {
//         from: "users",
//         localField: "author",
//         foreignField: "_id",
//         as: "author",
//       },
//     },
//     { $unwind: "$author" },

//     {
//       $addFields: {
//         "author.isMe": userId
//           ? { $eq: ["$author._id", new mongoose.Types.ObjectId(userId)] }
//           : false,
//         isFollowingAuthor: userId
//           ? { $in: ["$author._id", followingIds] }
//           : false,
//       },
//     },

//     {
//       $project: {
//         feedType: 1,

//         // author
//         "author._id": 1,
//         "author.name": 1,
//         "author.username": 1,
//         "author.avatar": 1,
//         "author.avatarUrl": 1,
//         "author.avatarKey": 1,
//         "author.profilePic": 1,
//         "author.isMe": 1,

//         isFollowingAuthor: 1,
//         // post
//         type: 1,
//         privacy: 1,
//         text: 1,
//         backgroundUrl: 1,
//         textStyle: 1,
//         medias: 1,
//         layout: 1,
//         mutedByDefault: 1,
//         loop: 1,
//         videoMode: 1,
//         feeling: 1,
//         category:1,

//         likeCount: 1,
//         commentCount: 1,
//         saveCount: 1,
//         createdAt: 1,
//         updatedAt: 1,
//         shareCount: 1,

//         // placeholders (we will attach below)
//         isLiked: 1,
//         isShared: 1,
//       },
//     },
//   ]);

//   /* ------------------------------------------------------------------ */
//   /* 2) GROUP POSTS (created + active member groups only)                */
//   /* ------------------------------------------------------------------ */
//   let groupItems = [];
//   if (userId) {
//     const meObjId = toOID(userId);
//     const allowedGroupIds = await getAllowedGroupIds(meObjId);

//     if (allowedGroupIds.length) {
//       groupItems = await GroupPost.aggregate([
//         {
//           $match: {
//             groupId: { $in: allowedGroupIds },
//             isDeleted: { $ne: true },
//             ...cursorFilter,
//           },
//         },
//         { $sort: { createdAt: -1, _id: -1 } },
//         { $limit: overFetch },

//         // join group
//         {
//           $lookup: {
//             from: "groups",
//             localField: "groupId",
//             foreignField: "_id",
//             as: "group",
//           },
//         },
//         { $unwind: "$group" },
//         { $match: { "group.isDeleted": { $ne: true } } },

//         // join author
//         {
//           $lookup: {
//             from: "users",
//             localField: "authorId",
//             foreignField: "_id",
//             as: "author",
//           },
//         },
//         { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },

//         {
//           $addFields: {
//             feedType: "groupPost",
//             isLiked: false,
//             isShared: false,
//           },
//         },

//         {
//           $project: {
//             feedType: 1,

//             _id: 1,
//             createdAt: 1,
//             updatedAt: 1,

//             // group post fields
//             type: 1,
//             text: 1,
//             caption: 1,
//             backgroundUrl: 1,
//             textStyle: 1,
//             images: 1,
//             video: 1,
//             layout: 1,
//             mutedByDefault: 1,
//             loop: 1,
//             category: 1,
//             subCategory: 1,
//             counts: 1,

//             group: {
//               _id: "$group._id",
//               name: "$group.name",
//               privacy: "$group.privacy",
//               coverUrl: "$group.coverUrl",
//               counts: "$group.counts",
//             },

//             author: {
//               _id: "$author._id",
//               name: "$author.name",
//               avatarUrl: "$author.avatarUrl",
//               avatarKey: "$author.avatarKey",
//             },

//             isLiked: 1,
//             isShared: 1,
//           },
//         },
//       ]);
//     }
//   }

//   /* ------------------------------------------------------------------ */
//   /* 3) Merge + Chronological Sort                                       */
//   /* ------------------------------------------------------------------ */
//   const mixed = [...postItems, ...groupItems].sort((a, b) => {
//     const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
//     const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
//     if (ta !== tb) return tb - ta;

//     const ida = String(a?._id || "");
//     const idb = String(b?._id || "");
//     return idb.localeCompare(ida);
//   });

//   const sliced = mixed.slice(0, take);

 

//   if (userId && sliced.length > 0) {
//     const normalPosts = sliced.filter((x) => x?.feedType === "post");
//     const groupPosts = sliced.filter((x) => x?.feedType === "groupPost");

//     const postIds = normalPosts.map((p) => p._id);
//     const groupPostIds = groupPosts.map((p) => p._id);

//     // ---- normal post like/share ----
//     let likedSet = new Set();
//     let sharedSet = new Set();

//     if (postIds.length) {
//       const [likedRows, sharedRows] = await Promise.all([
//         PostLike.find({ user: userId, post: { $in: postIds } })
//           .select("post")
//           .lean(),
//         PostShare.find({ user: userId, post: { $in: postIds } })
//           .select("post")
//           .lean(),
//       ]);
//       likedSet = new Set(likedRows.map((r) => String(r.post)));
//       sharedSet = new Set(sharedRows.map((r) => String(r.post)));
//     }

//     // ---- group post like/share ----
//     let gLikedSet = new Set();
//     let gSharedSet = new Set();

//     if (groupPostIds.length) {
//       const [gLikedRows, gSharedRows] = await Promise.all([
//         GroupPostLike.find({
//           userId: new mongoose.Types.ObjectId(userId),
//           postId: { $in: groupPostIds },
//         })
//           .select("postId")
//           .lean(),

//         GroupPostShare.find({
//           userId: new mongoose.Types.ObjectId(userId),
//           postId: { $in: groupPostIds },
//         })
//           .select("postId")
//           .lean(),
//       ]);

//       gLikedSet = new Set(gLikedRows.map((r) => String(r.postId)));
//       gSharedSet = new Set(gSharedRows.map((r) => String(r.postId)));
//     }

//     // ---- attach flags ----
//     for (const it of sliced) {
//       const id = String(it?._id);

//       if (it?.feedType === "post") {
//         it.isLiked = likedSet.has(id);
//         it.isShared = sharedSet.has(id);
//       } else if (it?.feedType === "groupPost") {
//         it.isLiked = gLikedSet.has(id);
//         it.isShared = gSharedSet.has(id);
//       } else {
//         it.isLiked = false;
//         it.isShared = false;
//       }
//     }
//   } else {
//     for (const it of sliced) {
//       it.isLiked = false;
//       it.isShared = false;
//     }
//   }

//   // ✅ unified response wrapper (Plan-1)
//   const items = sliced.map((x) => ({
//     feedType: x.feedType, // "post" | "groupPost"
//     data: x,
//   }));

//   /* ------------------------------------------------------------------ */
//   /* 5) nextCursor based on final mixed items                            */
//   /* ------------------------------------------------------------------ */
//   const nextCursor =
//     sliced.length > 0
//       ? {
//           createdAt: sliced[sliced.length - 1].createdAt,
//           _id: sliced[sliced.length - 1]._id,
//         }
//       : null;

//       // console.log("items", items);
      

//   return { items, nextCursor };
// }


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
      $addFields: {
        feedType: "post",
        "author.isMe": userId
          ? { $eq: ["$author._id", new mongoose.Types.ObjectId(userId)] }
          : false,
        isFollowingAuthor: userId
          ? { $in: ["$author._id", followingIds] }
          : false,
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

    const [likedRows, sharedRows, gLikedRows, gSharedRows] =
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
      ]);

    const likedSet = new Set(likedRows.map((r) => String(r.post)));
    const sharedSet = new Set(sharedRows.map((r) => String(r.post)));

    const gLikedSet = new Set(gLikedRows.map((r) => String(r.postId)));
    const gSharedSet = new Set(gSharedRows.map((r) => String(r.postId)));

    for (const it of sliced) {
      const id = String(it._id);

      if (it.feedType === "post") {
        it.isLiked = likedSet.has(id);
        it.isShared = sharedSet.has(id);
      } else {
        it.isLiked = gLikedSet.has(id);
        it.isShared = gSharedSet.has(id);
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