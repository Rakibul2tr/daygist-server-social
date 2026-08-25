import mongoose from "mongoose";
import Post from "../../models/post/post.model.js";
import Follow from "../../models/follow/follow.model.js";
import PostLike from "../../models/post/postLike.model.js";
import PostShare from "../../models/post/postShare.model.js";
import VideoInterest from "../../models/post/videoInterest.model.js";
import Save from "../../models/post/save.model.js";
import Ad from "../../models/ads/ad.model.js";
import AdView from "../../models/ads/adView.model.js";



const injectAdsIntoVideoFeed = (videos, ads, interval = 5) => {
  if (!ads?.length) {
    return videos;
  }

  const result = [];
  let adIndex = 0;

  videos.forEach((video, index) => {
    result.push({
      ...video,
      feedType: "video",
    });

    // প্রতি ৫টা video পর ad
    if ((index + 1) % interval === 0) {
      result.push({
        ...ads[adIndex % ads.length],
        feedType: "ad",
      });

      adIndex++;
    }
  });

  return result;
};

export async function getVideoFeed({
  userId,
  limit = 20,
  cursor,
  category,
  subCategory,
  search,
}) {
  const take = Math.min(Number(limit) || 20, 50);

  let cursorFilter = {};
  if (cursor?.createdAt && cursor?._id) {
    cursorFilter = {
      $or: [
        { createdAt: { $lt: new Date(cursor.createdAt) } },
        {
          createdAt: new Date(cursor.createdAt),
          _id: { $lt: new mongoose.Types.ObjectId(cursor._id) },
        },
      ],
    };
  }

  const followingDocs = userId
    ? await Follow.find({ follower: userId }).select("following").lean()
    : [];
  const followingIds = followingDocs.map((f) => f.following);

  // current user targeting data
  let me = null;

  if (userId) {
    const User = mongoose.model("User");

    me = await User.findById(userId).select("country gender age").lean();
  }

  const myCountry = me?.country || null;
  const myGender = me?.gender || null;
  const myAge = Number(me?.age || 0);

  // client category/subCategory না দিলে interest থেকে auto
  let autoCategories = [];
  let autoSubCats = [];

  if (userId && !category && !subCategory) {
    const top = await VideoInterest.find({ userId })
      .sort({ score: -1, lastWatchedAt: -1 })
      .limit(3)
      .lean();

    autoCategories = top.map((x) => x.category).filter(Boolean);
    autoSubCats = top.map((x) => x.subCategory).filter(Boolean);
  }

  // VIDEO only
  const match = {
    isDeleted: false,
    type: "video",
    status: "active",
    ...cursorFilter,
  };

  // explicit query > interest > no filter
  if (category || subCategory || search) {
    if (category) match.category = category;
    if (subCategory) match.subCategory = subCategory;
    if (search) match.text = search;
  } else if (autoCategories.length || autoSubCats.length) {
    match.$or = [
      autoSubCats.length ? { subCategory: { $in: autoSubCats } } : null,
      autoCategories.length ? { category: { $in: autoCategories } } : null,
    ].filter(Boolean);
  }

  const items = await Post.aggregate([
    { $match: match },

    // author info join আগে করি, কারণ country লাগবে
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
        isFollowingAuthor: { $in: ["$author._id", followingIds] },

        isSameCountry:
          userId && myCountry ? { $eq: ["$author.country", myCountry] } : false,
      },
    },

    // priority:
    // 1 = following user
    // 2 = same country (but not following)
    // 3 = other user
    {
      $addFields: {
        priorityRank: {
          $switch: {
            branches: [
              { case: { $eq: ["$isFollowingAuthor", true] }, then: 1 },
              { case: { $eq: ["$isSameCountry", true] }, then: 2 },
            ],
            default: 3,
          },
        },
      },
    },

    // followed first -> country -> others
    // each group newest first
    { $sort: { priorityRank: 1, createdAt: -1, _id: -1 } },

    { $limit: take },

    {
      $addFields: {
        "author.isFollowing": "$isFollowingAuthor",
        "author.isMe": userId
          ? { $eq: ["$author._id", new mongoose.Types.ObjectId(userId)] }
          : false,
      },
    },

    {
      $project: {
        "author._id": 1,
        "author.name": 1,
        "author.username": 1,
        "author.avatar": 1,
        "author.profilePic": 1,
        "author.country": 1,
        "author.isFollowing": 1,
        "author.isMe": 1,

        type: 1,
        text: 1,
        medias: 1,
        mutedByDefault: 1,
        loop: 1,
        videoMode: 1,

        category: 1,
        subCategory: 1,

        likeCount: 1,
        commentCount: 1,
        saveCount: 1,
        shareCount: 1,
        viewCount: 1,

        isFollowingAuthor: 1,
        isSameCountry: 1,
        priorityRank: 1,

        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  // =========================
  // GET ACTIVE ADS
  // =========================

  const activeAds = await Ad.aggregate([
    {
      $match: {
        status: "active",
        adType: "video",
        remaining_budget: { $gt: 0 },
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "advertiserId",
        foreignField: "_id",
        as: "advertiser",
      },
    },

    {
      $unwind: {
        path: "$advertiser",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        title: 1,
        description: 1,
        adType: 1,
        adCategory: 1,

        media: 1,
        thumbnail: 1,

        placement: 1,
        ctaLink: 1,
        ctaText: 1,

        status: 1,

        gender: 1,
        age: 1,
        country: 1,

        duration: 1,
        isSkippable: 1,
        skipAfter: 1,

        impressions: 1,
        clicks: 1,
        likeCount: 1,
        commentCount: 1,
        shareCount: 1,

        cost_per_view: 1,
        remaining_budget: 1,

        startDate: 1,
        endDate: 1,

        createdAt: 1,
        updatedAt: 1,

        advertiserId: 1,

        // 👇 শুধু দরকারি advertiser information
        advertiser: {
          _id: "$advertiser._id",
          name: "$advertiser.name",
          username: "$advertiser.username",
          avatar: "$advertiser.avatar",
        },
      },
    },

    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  // =========================
  // AD TARGETING FILTER
  // =========================

  const filteredAds = activeAds.filter((ad) => {
    // =====================
    // COUNTRY
    // =====================

    if (Array.isArray(ad.country) && ad.country.length > 0) {
      if (!myCountry || !ad.country.includes(myCountry)) {
        return false;
      }
    }

    // =====================
    // GENDER
    // =====================

    if (Array.isArray(ad.gender) && ad.gender.length > 0) {
      if (!myGender || !ad.gender.includes(myGender)) {
        return false;
      }
    }

    // =====================
    // AGE
    // =====================

    if (ad.age && ad.age !== "all") {
      if (!myAge) {
        return false;
      }

      if (ad.age === "18-24") {
        if (myAge < 18 || myAge > 24) {
          return false;
        }
      }

      if (ad.age === "25-34") {
        if (myAge < 25 || myAge > 34) {
          return false;
        }
      }

      if (ad.age === "35-54") {
        if (myAge < 35 || myAge > 54) {
          return false;
        }
      }

      if (ad.age === "55+") {
        if (myAge < 55) {
          return false;
        }
      }
    }

    return true;
  });



  // =========================
  // REMOVE ALREADY VIEWED ADS
  // =========================

  let unseenAds = filteredAds;

  if (userId && filteredAds.length > 0) {
    const adIds = filteredAds.map((ad) => ad._id);

    const viewedAds = await AdView.find({
      userId,
      adId: { $in: adIds },
    })
      .select("adId")
      .lean();

    const viewedAdIds = new Set(viewedAds.map((item) => String(item.adId)));

    unseenAds = filteredAds.filter((ad) => !viewedAdIds.has(String(ad._id)));
  }
  const adsToShow = unseenAds.length > 0 ? unseenAds : filteredAds;

  

  // attach isLiked / isShared
  if (userId && items.length > 0) {
    const postIds = items.map((p) => p._id);

    const [likedRows, sharedRows, savedRows] = await Promise.all([
      PostLike.find({ user: userId, post: { $in: postIds } })
        .select("post type")
        .lean(),
      PostShare.find({ user: userId, post: { $in: postIds } })
        .select("post")
        .lean(),
      // ✅ ONLY POST SAVE (correct)
      Save.find({
        user: userId,
        targetId: { $in: postIds },
        targetType: "post",
      })
        .select("targetId")
        .lean(),
    ]);

    // const likedSet = new Set(likedRows.map((r) => String(r.post)));
    const likedMap = new Map(
      likedRows.map((r) => [String(r.post), r.type || "like"]),
    );
    // console.log("likedMap", likedMap);

    const sharedSet = new Set(sharedRows.map((r) => String(r.post)));
    const savedPostSet = new Set(savedRows.map((r) => String(r.targetId)));

    for (const p of items) {
      const pid = String(p._id);
      p.isLiked = likedMap.has(pid);
      p.reaction = likedMap.get(pid) || null;
      p.isShared = sharedSet.has(pid);

      // ✅ ADD THIS
      p.isSaved = savedPostSet.has(pid);
    }
  } else {
    for (const p of items) {
      p.isLiked = false;
      p.reaction = null;
      p.isShared = false;
      p.isSaved = false; // ✅ ADD
    }
  }

  const normalizedAds = adsToShow.map((ad) => ({
    ...ad,

    feedType: "ad",

    // normal reel-এর মতো common fields
    likeCount: ad.likeCount ?? 0,
    commentCount: ad.commentCount ?? 0,
    shareCount: ad.shareCount ?? 0,
    saveCount: 0,
    viewCount: ad.impressions ?? 0,

    // user-specific এখন false
    isLiked: false,
    isShared: false,
    isSaved: false,
    reaction: null,
  }));
const finalItems = injectAdsIntoVideoFeed(items, normalizedAds, 5);
  const nextCursor =
    items.length > 0
      ? {
          createdAt: items[items.length - 1].createdAt,
          _id: items[items.length - 1]._id,
        }
      : null;

  return {
    items: finalItems,
    nextCursor,
    meta: {
      usedInterestCategories: autoCategories,
      usedInterestSubCategories: autoSubCats,
      myCountry,
    },
  };
}

// import mongoose from "mongoose";
// import Post from "../../models/post/post.model.js";
// import Follow from "../../models/follow/follow.model.js";
// import PostLike from "../../models/post/postLike.model.js";
// import PostShare from "../../models/post/postShare.model.js";
// import VideoInterest from "../../models/post/videoInterest.model.js";

export async function getGeneralVideoFeed({
  userId,
  limit = 20,
  cursor,
  category,
  subCategory,
}) {
  const take = Math.min(Number(limit) || 20, 50);

  let cursorFilter = {};
  if (cursor?.createdAt && cursor?._id) {
    cursorFilter = {
      $or: [
        { createdAt: { $lt: new Date(cursor.createdAt) } },
        {
          createdAt: new Date(cursor.createdAt),
          _id: { $lt: new mongoose.Types.ObjectId(cursor._id) },
        },
      ],
    };
  }

  const followingDocs = userId
    ? await Follow.find({ follower: userId }).select("following").lean()
    : [];
  const followingIds = followingDocs.map((f) => f.following);

  // ✅ if client doesn't pass category/subCategory => auto from interest
  let autoCategories = [];
  let autoSubCats = [];

  if (userId && !category && !subCategory) {
    const top = await VideoInterest.find({ userId })
      .sort({ score: -1, lastWatchedAt: -1 })
      .limit(3)
      .lean();

    autoCategories = top.map((x) => x.category).filter(Boolean);
    autoSubCats = top.map((x) => x.subCategory).filter(Boolean);
  }

  // ✅ base match for VIDEO only
  const match = {
    isDeleted: false,
    type: "video",
    ...cursorFilter,
  };

  // ✅ priority: explicit query > interest > no filter
  if (category || subCategory) {
    if (category) match.category = category;
    if (subCategory) match.subCategory = subCategory;
  } else if (autoCategories.length || autoSubCats.length) {
    match.$or = [
      autoSubCats.length ? { subCategory: { $in: autoSubCats } } : null,
      autoCategories.length ? { category: { $in: autoCategories } } : null,
    ].filter(Boolean);
  }

  const items = await Post.aggregate([
    { $match: match },

    {
      $addFields: {
        isFollowingAuthor: { $in: ["$author", followingIds] },
      },
    },

    // ✅ followed-first + newest (same as you had)
    { $sort: { isFollowingAuthor: -1, createdAt: -1, _id: -1 } },
    { $limit: take },

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
        "author.isFollowing": "$isFollowingAuthor",
        "author.isMe": userId
          ? { $eq: ["$author._id", new mongoose.Types.ObjectId(userId)] }
          : false,
      },
    },

    {
      $project: {
        "author._id": 1,
        "author.name": 1,
        "author.username": 1,
        "author.avatar": 1,
        "author.profilePic": 1,
        "author.isFollowing": 1,
        "author.isMe": 1,

        type: 1,
        text: 1,
        medias: 1,
        mutedByDefault: 1,
        loop: 1,
        videoMode: 1,

        category: 1,
        subCategory: 1,

        likeCount: 1,
        commentCount: 1,
        saveCount: 1,
        shareCount: 1,
        viewCount: 1,

        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  // ✅ attach isLiked / isShared for current user (batch)
  if (userId && items.length > 0) {
    const postIds = items.map((p) => p._id);

    const [likedRows, sharedRows] = await Promise.all([
      PostLike.find({ user: userId, post: { $in: postIds } })
        .select("post")
        .lean(),
      PostShare.find({ user: userId, post: { $in: postIds } })
        .select("post")
        .lean(),
    ]);

    const likedSet = new Set(likedRows.map((r) => String(r.post)));
    const sharedSet = new Set(sharedRows.map((r) => String(r.post)));

    for (const p of items) {
      const pid = String(p._id);
      p.isLiked = likedSet.has(pid);
      p.isShared = sharedSet.has(pid);
    }
  } else {
    for (const p of items) {
      p.isLiked = false;
      p.isShared = false;
    }
  }

  const nextCursor =
    items.length > 0
      ? {
          createdAt: items[items.length - 1].createdAt,
          _id: items[items.length - 1]._id,
        }
      : null;

  return {
    items,
    nextCursor,
    // ✅ optional debug/meta (client ignore করতে পারে)
    meta: {
      usedInterestCategories: autoCategories,
      usedInterestSubCategories: autoSubCats,
    },
  };
}
