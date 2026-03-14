// // src/services/feed/getHomeFeed.js
// import mongoose from "mongoose";
// import Post from "../../models/post/post.model.js";
// import Follow from "../../models/follow/follow.model.js";
// import PostLike from "../../models/post/postLike.model.js";
// import PostShare from "../../models/post/postShare.model.js";


// export async function getHomeFeed({ userId, limit = 20, cursor }) {
//   const take = Math.min(Number(limit) || 20, 50);

//   let cursorFilter = {};
//   if (cursor?.createdAt && cursor?._id) {
//     cursorFilter = {
//       $or: [
//         { createdAt: { $lt: new Date(cursor.createdAt) } },
//         {
//           createdAt: new Date(cursor.createdAt),
//           _id: { $lt: new mongoose.Types.ObjectId(cursor._id) },
//         },
//       ],
//     };
//   }

//   // ✅ user follows list (guest হলে empty)
//   const followingDocs = userId
//     ? await Follow.find({ follower: userId }).select("following").lean()
//     : [];

//   const followingIds = followingDocs.map((f) => f.following); // ObjectId[]

//   const items = await Post.aggregate([
//     { $match: { isDeleted: false, ...cursorFilter } },

//     // ✅ boolean: author is in my following list?
//     {
//       $addFields: {
//         isFollowingAuthor: { $in: ["$author", followingIds] }, // true/false
//       },
//     },

//     // ✅ followed first, then newest
//     { $sort: { isFollowingAuthor: -1, createdAt: -1, _id: -1 } },

//     { $limit: take },

//     {
//       $lookup: {
//         from: "users",
//         localField: "author",
//         foreignField: "_id",
//         as: "author",
//       },
//     },
//     { $unwind: "$author" },

//     // ✅ attach to author
//     {
//       $addFields: {
//         "author.isFollowing": "$isFollowingAuthor",
//         "author.isMe": userId
//           ? { $eq: ["$author._id", new mongoose.Types.ObjectId(userId)] }
//           : false,
//       },
//     },

//     {
//       $project: {
//         // author
//         "author._id": 1,
//         "author.name": 1,
//         "author.username": 1,
//         "author.avatar": 1,
//         "author.profilePic": 1,
//         "author.isFollowing": 1, // ✅ NEW
//         "author.isMe": 1, // ✅ optional (button hide করতে)

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

//         likeCount: 1,
//         commentCount: 1,
//         saveCount: 1,
//         isLiked: 1,
//         isShared: 1,
//         createdAt: 1,
//         updatedAt: 1,
//         shareCount: 1,
//       },
//     },
//   ]);

//   // ✅ attach isLiked / isShared for current user (single batch queries)
//   if (userId && items.length > 0) {
//     const postIds = items.map((p) => p._id);

//     // liked posts by me
//     const likedRows = await PostLike.find({
//       user: userId,
//       post: { $in: postIds },
//     })
//       .select("post")
//       .lean();

//     const likedSet = new Set(likedRows.map((r) => String(r.post)));

//     // shared posts by me
//     const sharedRows = await PostShare.find({
//       user: userId,
//       post: { $in: postIds },
//     })
//       .select("post")
//       .lean();

//     const sharedSet = new Set(sharedRows.map((r) => String(r.post)));

//     // attach booleans
//     for (const p of items) {
//       const pid = String(p._id);
//       p.isLiked = likedSet.has(pid);
//       p.isShared = sharedSet.has(pid);
//     }
//   } else {
//     // guest/default
//     for (const p of items) {
//       p.isLiked = false;
//       p.isShared = false;
//     }
//   }

//   const nextCursor =
//     items.length > 0
//       ? {
//           createdAt: items[items.length - 1].createdAt,
//           _id: items[items.length - 1]._id,
//         }
//       : null;

//   return { items, nextCursor };
// }




// src/services/feed/getHomeFeed.js
import mongoose from "mongoose";

import Post from "../../models/post/post.model.js";
import Follow from "../../models/follow/follow.model.js";
import PostLike from "../../models/post/postLike.model.js";
import PostShare from "../../models/post/postShare.model.js";

// ✅ group imports
import Group from "../../models/group/group.model.js";
import GroupMember from "../../models/group/groupMember.model.js";
import GroupPost from "../../models/group/groupPost.model.js";
import GroupPostShare from "../../models/group/groupPostShare.model.js";
import GroupPostLike from "../../models/group/groupPostLike.model.js";

const toOID = (id) => new mongoose.Types.ObjectId(id);

// cursor = { createdAt, _id }
const buildCursorFilter = (cursor) => {
  if (!cursor?.createdAt || !cursor?._id) return {};
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

// ✅ user allowed group ids = (active member) + (created by me)
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
    [...memberGroupIds, ...createdGroupIds].map((x) => String(x))
  );

  return Array.from(set).map((id) => toOID(id));
}

export async function getHomeFeed({ userId, limit = 20, cursor }) {
  const take = Math.min(Number(limit) || 20, 50);
  const cursorFilter = buildCursorFilter(cursor);

  // ✅ overfetch (merge করার পরে slice করবো)
  const overFetch = Math.min(take * 2, 80);

  // ✅ user follows list
  const followingDocs = userId
    ? await Follow.find({ follower: userId }).select("following").lean()
    : [];

  const followingIds = followingDocs.map((f) => f.following); // ObjectId[]

  /* ------------------------------------------------------------------ */
  /* 1) NORMAL POSTS (your existing feed, keep it as-is)                 */
  /* ------------------------------------------------------------------ */
  const postItems = await Post.aggregate([
    { $match: { isDeleted: false, ...cursorFilter } },

    {
      $addFields: {
        feedType: "post", // ✅ mark type
      },
    },

    // ✅ chronological only (FB mix base)
    { $sort: { createdAt: -1, _id: -1 } },

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
        "author.isMe": userId
          ? { $eq: ["$author._id", new mongoose.Types.ObjectId(userId)] }
          : false,
      },
    },

    {
      $project: {
        feedType: 1,

        // author
        "author._id": 1,
        "author.name": 1,
        "author.username": 1,
        "author.avatar": 1,
        "author.avatarUrl": 1,
        "author.avatarKey": 1,
        "author.profilePic": 1,
        "author.isMe": 1,

        // post
        type: 1,
        privacy: 1,
        text: 1,
        backgroundUrl: 1,
        textStyle: 1,
        medias: 1,
        layout: 1,
        mutedByDefault: 1,
        loop: 1,
        videoMode: 1,

        likeCount: 1,
        commentCount: 1,
        saveCount: 1,
        createdAt: 1,
        updatedAt: 1,
        shareCount: 1,

        // placeholders (we will attach below)
        isLiked: 1,
        isShared: 1,
      },
    },
  ]);

  /* ------------------------------------------------------------------ */
  /* 2) GROUP POSTS (created + active member groups only)                */
  /* ------------------------------------------------------------------ */
  let groupItems = [];
  if (userId) {
    const meObjId = toOID(userId);
    const allowedGroupIds = await getAllowedGroupIds(meObjId);

    if (allowedGroupIds.length) {
      groupItems = await GroupPost.aggregate([
        {
          $match: {
            groupId: { $in: allowedGroupIds },
            isDeleted: { $ne: true },
            ...cursorFilter,
          },
        },
        { $sort: { createdAt: -1, _id: -1 } },
        { $limit: overFetch },

        // join group
        {
          $lookup: {
            from: "groups",
            localField: "groupId",
            foreignField: "_id",
            as: "group",
          },
        },
        { $unwind: "$group" },
        { $match: { "group.isDeleted": { $ne: true } } },

        // join author
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

        {
          $project: {
            feedType: 1,

            _id: 1,
            createdAt: 1,
            updatedAt: 1,

            // group post fields
            type: 1,
            text: 1,
            caption: 1,
            backgroundUrl: 1,
            textStyle: 1,
            images: 1,
            video: 1,
            layout: 1,
            mutedByDefault: 1,
            loop: 1,
            category: 1,
            subCategory: 1,
            counts: 1,

            group: {
              _id: "$group._id",
              name: "$group.name",
              privacy: "$group.privacy",
              coverUrl: "$group.coverUrl",
              counts: "$group.counts",
            },

            author: {
              _id: "$author._id",
              name: "$author.name",
              avatarUrl: "$author.avatarUrl",
              avatarKey: "$author.avatarKey",
            },

            isLiked: 1,
            isShared: 1,
          },
        },
      ]);
    }
  }

  /* ------------------------------------------------------------------ */
  /* 3) Merge + Chronological Sort                                       */
  /* ------------------------------------------------------------------ */
  const mixed = [...postItems, ...groupItems].sort((a, b) => {
    const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (ta !== tb) return tb - ta;

    const ida = String(a?._id || "");
    const idb = String(b?._id || "");
    return idb.localeCompare(ida);
  });

  const sliced = mixed.slice(0, take);

  /* ------------------------------------------------------------------ */
  /* 4) Attach isLiked / isShared only for normal posts                  */
  /* ------------------------------------------------------------------ */
  // if (userId && sliced.length > 0) {
  //   const postOnly = sliced.filter((x) => x?.feedType === "post");
  //   const postIds = postOnly.map((p) => p._id);

  //   if (postIds.length) {
  //     const [likedRows, sharedRows] = await Promise.all([
  //       PostLike.find({ user: userId, post: { $in: postIds } })
  //         .select("post")
  //         .lean(),
  //       PostShare.find({ user: userId, post: { $in: postIds } })
  //         .select("post")
  //         .lean(),
  //     ]);

  //     const likedSet = new Set(likedRows.map((r) => String(r.post)));
  //     const sharedSet = new Set(sharedRows.map((r) => String(r.post)));

  //     for (const it of sliced) {
  //       if (it?.feedType !== "post") continue;
  //       const pid = String(it._id);
  //       it.isLiked = likedSet.has(pid);
  //       it.isShared = sharedSet.has(pid);
  //     }
  //   } else {
  //     for (const it of sliced) {
  //       if (it?.feedType === "post") {
  //         it.isLiked = false;
  //         it.isShared = false;
  //       }
  //     }
  //   }
  // } else {
  //   for (const it of sliced) {
  //     it.isLiked = false;
  //     it.isShared = false;
  //   }
  // }

  if (userId && sliced.length > 0) {
    const normalPosts = sliced.filter((x) => x?.feedType === "post");
    const groupPosts = sliced.filter((x) => x?.feedType === "groupPost");

    const postIds = normalPosts.map((p) => p._id);
    const groupPostIds = groupPosts.map((p) => p._id);

    // ---- normal post like/share ----
    let likedSet = new Set();
    let sharedSet = new Set();

    if (postIds.length) {
      const [likedRows, sharedRows] = await Promise.all([
        PostLike.find({ user: userId, post: { $in: postIds } })
          .select("post")
          .lean(),
        PostShare.find({ user: userId, post: { $in: postIds } })
          .select("post")
          .lean(),
      ]);
      likedSet = new Set(likedRows.map((r) => String(r.post)));
      sharedSet = new Set(sharedRows.map((r) => String(r.post)));
    }

    // ---- group post like/share ----
    let gLikedSet = new Set();
    let gSharedSet = new Set();

    if (groupPostIds.length) {
      const [gLikedRows, gSharedRows] = await Promise.all([
        GroupPostLike.find({
          userId: new mongoose.Types.ObjectId(userId),
          postId: { $in: groupPostIds },
        })
          .select("postId")
          .lean(),

        GroupPostShare.find({
          userId: new mongoose.Types.ObjectId(userId),
          postId: { $in: groupPostIds },
        })
          .select("postId")
          .lean(),
      ]);

      gLikedSet = new Set(gLikedRows.map((r) => String(r.postId)));
      gSharedSet = new Set(gSharedRows.map((r) => String(r.postId)));
    }

    // ---- attach flags ----
    for (const it of sliced) {
      const id = String(it?._id);

      if (it?.feedType === "post") {
        it.isLiked = likedSet.has(id);
        it.isShared = sharedSet.has(id);
      } else if (it?.feedType === "groupPost") {
        it.isLiked = gLikedSet.has(id);
        it.isShared = gSharedSet.has(id);
      } else {
        it.isLiked = false;
        it.isShared = false;
      }
    }
  } else {
    for (const it of sliced) {
      it.isLiked = false;
      it.isShared = false;
    }
  }
  
  
 
 
  // ✅ unified response wrapper (Plan-1)
  const items = sliced.map((x) => ({
    feedType: x.feedType, // "post" | "groupPost"
    data: x,
  }));

  /* ------------------------------------------------------------------ */
  /* 5) nextCursor based on final mixed items                            */
  /* ------------------------------------------------------------------ */
  const nextCursor =
    sliced.length > 0
      ? {
          createdAt: sliced[sliced.length - 1].createdAt,
          _id: sliced[sliced.length - 1]._id,
        }
      : null;

  return { items, nextCursor };
}
