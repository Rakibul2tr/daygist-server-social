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
import Block from "../../models/follow/block.model.js";
import Ad from "../../models/ads/ad.model.js";
import User from "../../models/user/user.model.js";
import HtmlAd from "../../models/ads/htmlAd.model.js";

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

// helper for ads inject
function injectAds(items, ads, interval = 5) {
  if (!ads?.length) return items;

  if (!ads?.length || items.length < interval) {
    return items;
  }

  const result = [];

  let adIndex = 0;
  let postCount = 0;

  for (const item of items) {
    result.push(item);

    // শুধু post/groupPost count হবে
    if (item.feedType === "post" || item.feedType === "groupPost") {
      postCount++;
    }

    if (postCount === interval) {
      result.push({
        feedType: "ads",
        data: ads[adIndex],
      });

      adIndex = (adIndex + 1) % ads.length;
      postCount = 0;
    }
  }

  return result;
}

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

// block users access
async function getBlockedUserIds(userId) {
  if (!userId) return [];

  const rows = await Block.find({
    $or: [{ blockerId: userId }, { blockedUserId: userId }],
  })
    .select("blockerId blockedUserId")
    .lean();

  const ids = new Set();

  for (const row of rows) {
    if (String(row.blockerId) === String(userId)) {
      ids.add(String(row.blockedUserId));
    } else {
      ids.add(String(row.blockerId));
    }
  }

  return [...ids].map((id) => new mongoose.Types.ObjectId(id));
}

// circle users access
async function getCircleUserIds(userId) {
  if (!userId) return [];

  const following = await Follow.find({
    follower: userId,
  })
    .select("following")
    .lean();

  const followingIds = following.map((x) => String(x.following));

  if (!followingIds.length) return [];

  const followers = await Follow.find({
    follower: { $in: followingIds },
    following: userId,
  })
    .select("follower")
    .lean();

  return followers.map((x) => new mongoose.Types.ObjectId(x.follower));
}

function injectHtmlAds(items, htmlAds, interval = 12) {
  // console.log("html", htmlAds, interval);
  
  if (!htmlAds?.length || items.length < interval) {
    return items;
  }

  const result = [];

  let adIndex = 0;
  let postCount = 0;

  for (const item of items) {
    result.push(item);

    if (item.feedType === "post" || item.feedType === "groupPost") {
      postCount++;
    }

    if (postCount === interval) {
      result.push({
        feedType: "htmlAd",
        data: htmlAds[adIndex],
      });

      adIndex = (adIndex + 1) % htmlAds.length;
      postCount = 0;
    }
  }
  
  //  console.log("result ", result);

  return result;
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

  const me = userId
    ? await User.findById(userId).select("country gender age").lean()
    : null;

  // block user get
  const blockedIds = await getBlockedUserIds(userId);

  // circle users get
  const circleIds = await getCircleUserIds(userId);

  /* ---------------------- POSTS (MAIN SOURCE) ---------------------- */
  const postPipeline = [
    {
      $match: {
        isDeleted: false,
        status: "active",

        ...(blockedIds.length
          ? {
              author: {
                $nin: blockedIds,
              },
            }
          : {}),
      },
    },

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
        priority: {
          $cond: [
            {
              $in: ["$author._id", circleIds],
            },
            2,
            {
              $cond: [
                {
                  $in: ["$author._id", followingIds],
                },
                1,
                0,
              ],
            },
          ],
        },
        "author.isMe": userId
          ? { $eq: ["$author._id", new mongoose.Types.ObjectId(userId)] }
          : false,
        isFollowingAuthor: userId
          ? { $in: ["$author._id", followingIds] }
          : false,
        // ✅ NEW
        isCircleAuthor: userId ? { $in: ["$author._id", circleIds] } : false,

        isRePost: {
          $ifNull: ["$isRePost", false],
        },
      },
    },
    {
      $sort: {
        priority: -1,
        createdAt: -1,
        _id: -1,
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
            groupId: {
              $in: allowedGroupIds,
            },

            isDeleted: {
              $ne: true,
            },

            ...(blockedIds.length
              ? {
                  authorId: {
                    $nin: blockedIds,
                  },
                }
              : {}),
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
            priority: {
              $cond: [
                { $in: ["$author._id", circleIds] },
                2,
                {
                  $cond: [{ $in: ["$author._id", followingIds] }, 1, 0],
                },
              ],
            },
            // ✅ NEW
            isCircleAuthor: userId
              ? { $in: ["$author._id", circleIds] }
              : false,

            isLiked: false,
            isShared: false,
          },
        },
        {
          $sort: {
            priority: -1,
            createdAt: -1,
            _id: -1,
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
    // Newest
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
          .select("post type")
          .lean(),

        PostShare.find({ user: userId, post: { $in: postIds } })
          .select("post")
          .lean(),

        GroupPostLike.find({
          userId: userId,
          postId: { $in: groupPostIds },
        })
          .select("postId type")
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

    // const likedSet = new Set(likedRows.map((r) => String(r.post)));
    const likedMap = new Map(
      likedRows.map((r) => [String(r.post), r.type || "like"]),
    );
    const sharedSet = new Set(sharedRows.map((r) => String(r.post)));

    // const gLikedSet = new Set(gLikedRows.map((r) => String(r.postId)));
    const gLikedMap = new Map(
      gLikedRows.map((r) => [String(r.postId), r.type || "like"]),
    );
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
        it.isLiked = likedMap.has(id);
        it.reaction = likedMap.get(id) || null;
        it.isShared = sharedSet.has(id);
        // ✅ SAVE
        it.isSave = savedPostSet.has(id);
      } else {
        it.isLiked = gLikedMap.has(id);
        it.reaction = gLikedMap.get(id) || null;
        it.isShared = gSharedSet.has(id);

        it.isSave = savedGroupSet.has(id);
      }
    }
  }

  // ads get
  const ads = await Ad.find({
    status: "active",
    remaining_budget: { $gt: 0 },
   
  })
    .sort({ createdAt: -1 })
    .populate("advertiserId", "name email avatar ") // ➔ প্রোভাইডার ডাটা যুক্ত হলো
    .lean();
    // console.log("ads", ads);

    let filteredAds = [...ads];

    const htmlAds = await HtmlAd.find({
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .lean();

      // console.log("htmlAds ", htmlAds);

    if (me) {
      filteredAds = ads.filter((ad) => {
        // ---------- Country ----------
        if (
          Array.isArray(ad.country) &&
          ad.country.length &&
          !ad.country.includes(me.country)
        ) {
          return false;
        }

        // ---------- Gender ----------
        if (
          Array.isArray(ad.gender) &&
          ad.gender.length &&
          !ad.gender.includes(me.gender)
        ) {
          return false;
        }

        // ---------- Age ----------
        const age = Number(me.age || 0);

        switch (ad.ageGroup) {
          case "adult":
            if (age < 18) return false;
            break;

          case "under_adult":
            if (age >= 18) return false;
            break;

          case "everyone":
          default:
            break;
        }

        return true;
      });
    }

 
  
  if (userId && filteredAds.length > 0) {
    const adIds = filteredAds.map((a) => a._id);
    
    

    // আমাদের পলিমরফিক 'PostLike' টেবিল থেকে এই ইউজারের বিজ্ঞপ্তির লাইকগুলো একবারে রিড করা
    const adLikedRows = await PostLike.find({
      user: userId,
      post: { $in: adIds },
    })
      .select("post type")
      .lean();

    const adLikedMap = new Map(
      adLikedRows.map((r) => [String(r.post), r.type || "like"]),
    );

    // প্রতিটি বিজ্ঞপ্তির অবজেক্টের ভেতর লাইভ রিঅ্যাকশন ডাটা ইনজেক্ট করা
    for (const adItem of filteredAds) {
      const adIdStr = String(adItem._id);
      adItem.isLiked = adLikedMap.has(adIdStr);
      adItem.reaction = adLikedMap.get(adIdStr) || null;

      // ই-কমার্স শপ লিঙ্কিং বা প্রফেশনাল ইউআই এর জন্য প্রোভাইডারকে 'author' হিসেবে ওল্ড সিঙ্ক দেওয়া
      if (adItem.advertiserId) {
        adItem.author = adItem.advertiserId;
      }
    }
  }
  /* ---------------------- FINAL RESPONSE ---------------------- */
  const items = sliced.map((x) => ({
    feedType: x.feedType,
    data: x,
  }));

  // const finalItems = injectAds(items, filteredAds, 5);
  let finalItems = injectAds(items, filteredAds, 5);

  finalItems = injectHtmlAds(finalItems, htmlAds, 12);
 

  // 🔥 cursor ONLY from basePosts
  const last = basePosts[basePosts.length - 1];

  const nextCursor = last
    ? {
        createdAt: last.createdAt,
        _id: last._id,
      }
    : null;
  // console.log('final items',finalItems);

  // console.log('final items',finalItems);
  

  return { items: finalItems, nextCursor };
}


// export async function getHomeFeed({ userId, limit = 20, cursor }) {
//   const take = Math.min(Number(limit) || 20, 50);
//   const overFetch = Math.min(take * 2, 80);
//   const cursorFilter = buildCursorFilter(cursor);

//   /* ---------------------- FOLLOWING ---------------------- */
//   const followingDocs = userId
//     ? await Follow.find({ follower: userId }).select("following").lean()
//     : [];

//   const followingIds = followingDocs.map((f) => f.following);

//   /* ---------------------- POSTS (MAIN SOURCE) ---------------------- */
//   const postPipeline = [
//     { $match: { isDeleted: false, status: "active" } },

//     { $sort: { createdAt: -1, _id: -1 } },

//     ...(cursorFilter ? [{ $match: cursorFilter }] : []),

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
//       $lookup: {
//         from: "posts",
//         localField: "sharedPostId",
//         foreignField: "_id",
//         as: "sharedPost",
//       },
//     },
//     {
//       $unwind: {
//         path: "$sharedPost",
//         preserveNullAndEmptyArrays: true,
//       },
//     },
//     {
//       $lookup: {
//         from: "users",
//         localField: "sharedPost.author",
//         foreignField: "_id",
//         as: "sharedPost.author",
//       },
//     },
//     {
//       $unwind: {
//         path: "$sharedPost.author",
//         preserveNullAndEmptyArrays: true,
//       },
//     },

//     {
//       $lookup: {
//         from: "groups",
//         localField: "sharedPostId.groupId",
//         foreignField: "_id",
//         as: "sharedPostId.groupId",
//       },
//     },
//     {
//       $unwind: {
//         path: "$sharedPostId.groupId",
//         preserveNullAndEmptyArrays: true,
//       },
//     },
//     {
//       $addFields: {
//         feedType: "post",
//         "author.isMe": userId
//           ? { $eq: ["$author._id", new mongoose.Types.ObjectId(userId)] }
//           : false,
//         isFollowingAuthor: userId
//           ? { $in: ["$author._id", followingIds] }
//           : false,
//         isRePost: {
//           $ifNull: ["$isRePost", false],
//         },
//       },
//     },
//   ];

//   const postItems = await Post.aggregate(postPipeline);

//   /* ---------------------- GROUP POSTS (LIMITED MIX) ---------------------- */
//   let groupItems = [];

//   if (userId) {
//     const meObjId = toOID(userId);
//     const allowedGroupIds = await getAllowedGroupIds(meObjId);

//     if (allowedGroupIds.length) {
//       const groupPipeline = [
//         {
//           $match: {
//             groupId: { $in: allowedGroupIds },
//             isDeleted: { $ne: true },
//           },
//         },

//         { $sort: { createdAt: -1, _id: -1 } },

//         ...(cursorFilter ? [{ $match: cursorFilter }] : []),

//         { $limit: Math.floor(overFetch / 2) }, // 🔥 limit group posts

//         {
//           $lookup: {
//             from: "groups",
//             localField: "groupId",
//             foreignField: "_id",
//             as: "group",
//           },
//         },
//         { $unwind: "$group" },

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
//       ];

//       groupItems = await GroupPost.aggregate(groupPipeline);
//     }
//   }

//   /* ---------------------- PAGINATION FIX ---------------------- */
//   const basePosts = postItems.slice(0, take); // 🔥 main pagination source

//   const groupLimited = groupItems.slice(0, Math.floor(take / 3));

//   const mixed = [...basePosts, ...groupLimited].sort((a, b) => {
//     const ta = new Date(a.createdAt).getTime();
//     const tb = new Date(b.createdAt).getTime();
//     if (ta !== tb) return tb - ta;
//     return String(b._id).localeCompare(String(a._id));
//   });

//   const sliced = mixed.slice(0, take);

//   /* ---------------------- LIKE/SHARE ---------------------- */
//   if (userId && sliced.length > 0) {
//     const postIds = sliced
//       .filter((x) => x.feedType === "post")
//       .map((p) => p._id);

//     const groupPostIds = sliced
//       .filter((x) => x.feedType === "groupPost")
//       .map((p) => p._id);

//     const [likedRows, sharedRows, gLikedRows, gSharedRows, savedRows] =
//       await Promise.all([
//         PostLike.find({ user: userId, post: { $in: postIds } })
//           .select("post type")
//           .lean(),

//         PostShare.find({ user: userId, post: { $in: postIds } })
//           .select("post")
//           .lean(),

//         GroupPostLike.find({
//           userId: userId,
//           postId: { $in: groupPostIds },
//         })
//           .select("postId type")
//           .lean(),

//         GroupPostShare.find({
//           userId: userId,
//           postId: { $in: groupPostIds },
//         })
//           .select("postId")
//           .lean(),

//         // ✅ ONLY POST SAVE (correct)
//         Save.find({
//           user: userId,
//           $or: [
//             { targetId: { $in: postIds }, targetType: "post" },
//             { targetId: { $in: groupPostIds }, targetType: "groupPost" },
//           ],
//         })
//           .select("targetId targetType")
//           .lean(),
//       ]);

//     // const likedSet = new Set(likedRows.map((r) => String(r.post)));
//      const likedMap = new Map(
//        likedRows.map((r) => [String(r.post), r.type || "like"]),
//      );
//     const sharedSet = new Set(sharedRows.map((r) => String(r.post)));

//     // const gLikedSet = new Set(gLikedRows.map((r) => String(r.postId)));
//     const gLikedMap = new Map(
//       gLikedRows.map((r) => [String(r.postId), r.type || "like"]),
//     );
//     const gSharedSet = new Set(gSharedRows.map((r) => String(r.postId)));

//     const savedPostSet = new Set(
//       savedRows
//         .filter((r) => r.targetType === "post")
//         .map((r) => String(r.targetId)),
//     );

//     const savedGroupSet = new Set(
//       savedRows
//         .filter((r) => r.targetType === "groupPost")
//         .map((r) => String(r.targetId)),
//     );

//     for (const it of sliced) {
//       const id = String(it._id);

//       if (it.feedType === "post") {
//         it.isLiked = likedMap.has(id);
//         it.reaction = likedMap.get(id) || null;
//         it.isShared = sharedSet.has(id);

//         // ✅ SAVE
//         it.isSave = savedPostSet.has(id);
//       } else {
//         it.isLiked = gLikedMap.has(id);
//         it.reaction = gLikedMap.get(id) || null;
//         it.isShared = gSharedSet.has(id);

//         it.isSave = savedGroupSet.has(id);
//       }
//     }
//   }

//   /* ---------------------- FINAL RESPONSE ---------------------- */
//   const items = sliced.map((x) => ({
//     feedType: x.feedType,
//     data: x,
//   }));

//   // 🔥 cursor ONLY from basePosts
//   const last = basePosts[basePosts.length - 1];

//   const nextCursor = last
//     ? {
//         createdAt: last.createdAt,
//         _id: last._id,
//       }
//     : null;

//   return { items, nextCursor };
// }
