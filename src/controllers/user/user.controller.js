// FILE: src/controllers/user/user.controller.js
import mongoose from "mongoose";
import geoip from "geoip-lite";
import User from "../../models/user/user.model.js";
import Post from "../../models/post/post.model.js";
import { verifyGoogleToken } from "../../utils/googleVerify.js";
import { generateToken } from "../../utils/jwt.js";
import Follow from "../../models/follow/follow.model.js";
import Like from "../../models/post/postLike.model.js"; // যদি থাকে
import Share from "../../models/post/postShare.model.js";
import uploadToWasabi, {
  deleteFromWasabi,
} from "../../services/wbUpload.service.js";
import Setting from "../../models/settings/earnRuls.model.js";
import Wallet from "../../models/wallet/wallet.model.js";

const generateUsername = (email) => {
  const base = String(email || "user").split("@")[0];
  return `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
};

// for user info update helper
const s = (v) => (v == null ? "" : String(v));
const trimOrNull = (v) => {
  const t = s(v).trim();
  return t.length ? t : null;
};
// for user info update helper
const sanitizeEducation = (arr) => {
  if (!Array.isArray(arr)) return undefined;

  const cleaned = arr
    .map((e) => ({
      school: trimOrNull(e?.school),
      degree: trimOrNull(e?.degree),
      year: trimOrNull(e?.year),
    }))
    .filter((e) => e.school || e.degree || e.year);

  return cleaned.length ? cleaned : [];
};
export const googleLogin = async (req, res) => {
  try {
    const idToken = req.body?.idToken || req.body?.token;

    if (!idToken) {
      return res.status(400).json({ message: "Token required" });
    }

    const payload = await verifyGoogleToken(idToken);
    const { sub, email, name, picture } = payload || {};

    if (!sub || !email) {
      return res.status(401).json({ message: "Invalid Google token payload" });
    }

    let user = await User.findOne({
      $or: [{ googleId: sub }, { email }],
    });

    

    if (!user) {
      user = await User.create({
        googleId: sub,
        email,
        name,
        avatar: {
          url: picture || null,
          key: null,
          provider: "google",
        },
        username: generateUsername(email),
        role: "USER",
        accountStatus:"active"
      });
    } else {
      if (user?.accountStatus === "suspended") {
        return res.status(403).json({
          message: "Account suspended",
        });
      }
      // sync googleId if account existed before
      if (!user.googleId) user.googleId = sub;

      // optional profile sync
      if (!user.name && name) user.name = name;
      if (!user.avatar?.url && picture) {
        user.avatar = {
          url: picture,
          key: null,
          provider: "google",
        };
      }
      user.accountStatus = "active"; // ✅ auto reactivate on login (if you want)
      await user.save();
    }

    const token = generateToken({
      userId: user._id,
      role: user.role,
      profileCompleted: user.profileCompleted,
    });

    return res.json({ success: true, token, user });
  } catch (error) {
    console.log("verify error:", error?.message || error);
    return res.status(401).json({
      message: "Invalid Google token",
      error: String(error?.message || error),
    });
  }
};

export const completeProfile = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const body = req.body || {};
    // console.log('body',body);
    

    const update = {};

    // ✅ user selected country
    if ("name" in body) {
      update.name = s(body.name).trim();
    }

    if ("birthDate" in body) {
      update.birthDate = body.birthDate || null;
    }

    if ("country" in body) {
      update.country = String(body.country || "").trim();
    }

    if ("age" in body) {
      update.age = Number(body.age) || null;
    }

    // =========================
    // ✅ IP থেকে real country বের করা
    // =========================
    

    const clientIp =
      body.ip ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket?.remoteAddress ||
      req.ip;


    const geo = geoip.lookup(clientIp);
    console.log("geo", geo);

    // geo.country => BD, IN, US
    const countryCode = geo?.country || null;

    // ✅ country code => full country name
    const regionNames = new Intl.DisplayNames(["en"], {
      type: "region",
    });

    const realCountry = countryCode ? regionNames.of(countryCode) : null;
    // console.log("complete profile ip cont", realCountry);
    

    // ✅ db realCountry field
    update.realCountry = realCountry;

    // ✅ profile complete
    update.isNewUser = true;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: update,
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "Profile completed",
      user: {
        _id: user._id,
        name: user.name,
        birthDate: user.birthDate,
        country: user.country, // user selected
        realCountry: user.realCountry, // ip detected
        age: user.age,
        isNewUser: user.isNewUser,
      },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Profile update failed",
    });
  }
};

// export const completeProfile = async (req, res) => {
//   try {
//     const userId = req.user?._id;

//     if (!userId) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized",
//       });
//     }

//     const body = req.body || {};

//     const update = {};

//     // ✅ শুধু field পাঠালে update হবে
//     // ✅ না থাকলে পুরানো data থাকবে
//     if ("name" in body){
//       update.name = s(body.name).trim();
//     }

//     if ("birthDate" in body) {
//       update.birthDate = body.birthDate || null;
//     }

//     if ("country" in body) {
//       update.country = String(body.country || "").trim();
//     }

//     if ("age" in body) {
//       update.age = Number(body.age) || null;
//     }

//     // ✅ profile complete
//     update.isNewUser = true;

//     // ✅ কিছু না পাঠালে
//     if (!Object.keys(update).length) {
//       return res.json({
//         success: true,
//         message: "Nothing to update",
//       });
//     }

//     const user = await User.findByIdAndUpdate(
//       userId,
//       {
//         $set: update,
//       },
//       {
//         new: true,
//         runValidators: true,
//       },
//     ).lean();

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     return res.json({
//       success: true,
//       message: "Profile completed",
//       user: {
//         _id: user._id,
//         birthDate: user.birthDate,
//         country: user.country,
//         age: user.age,
//         isNewUser: user.isNewUser,
//       },
//     });
//   } catch (e) {
//     return res.status(500).json({
//       success: false,
//       message: e?.message || "Profile update failed",
//     });
//   }
// };

export const getMe = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(me).select("-googleId").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      success: true,
      data: {
        ...user,
        isMe: true,
        isFollowing: false, // নিজের ক্ষেত্রে লাগে না
      },
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Fetch me failed" });
  }
};
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password -googleId -__v")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({
      success: true,
      data: users,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Fetch users failed" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const me = req.user?._id;
    const userId = req.params.userId;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const user = await User.findById(userId).select("-googleId").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    let isFollowing = false;
    if (me && String(me) !== String(userId)) {
      isFollowing = !!(await Follow.exists({
        follower: me,
        following: userId,
      }));
    }

    const isMe = !!me && String(me) === String(userId);

    return res.json({ success: true, data: { ...user, isFollowing, isMe } });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Fetch user failed" });
  }
};
//delete user by admin
export const deleteUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    // Check user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete user
    await user.deleteOne();

    return res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Delete user failed",
    });
  }
};

export const updateMyAvatar = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    if (!req.file) {
      return res.status(400).json({ ok: false, message: "file missing" });
    }

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });

    // ✅ upload to wasabi
    const up = await uploadToWasabi({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      folder: "avatars",
    });

    // ✅ delete old avatar from wasabi (if exists)
    const oldKey = user?.avatar?.key;
    if (oldKey) {
      await deleteFromWasabi(oldKey).catch(() => {});
    }

    // ✅ save to user
    user.avatar = {
      url: up.url,
      key: up.key,
      provider: "wasabi",
    };

    await user.save();

    return res.json({
      ok: true,
      message: "Avatar updated",
      avatar: user.avatar,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        cover: user.cover,
      },
    });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Avatar update failed" });
  }
};

export const updateMyCover = async (req, res) => {
  // console.log('req cover',req.file);

  try {
    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    if (!req.file) {
      return res.status(400).json({ ok: false, message: "file missing" });
    }

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });

    // ✅ upload to wasabi
    const up = await uploadToWasabi({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      folder: "covers",
    });
    // console.log('upload',up);

    // ✅ delete old cover from wasabi (if exists)
    const oldKey = user?.cover?.key;
    if (oldKey) {
      await deleteFromWasabi(oldKey).catch(() => {});
    }

    // ✅ save to user
    user.cover = {
      url: up.url,
      key: up.key,
      provider: "wasabi",
    };

    const savedUser = await user.save();
    // console.log("res", savedUser);

    return res.json({
      ok: true,
      message: "Cover updated",
      user: {
        _id: savedUser._id,
        name: savedUser.name,
        username: savedUser.username,
        avatar: savedUser.avatar,
        cover: savedUser.cover,
      },
    });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Cover update failed" });
  }
};
export const updateMeProfile = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const body = req.body || {};

    // ✅ allowed fields only (security)
    const update = {};

    // ---- basic
    if ("name" in body) update.name = s(body.name).trim();
    if ("country" in body) update.country = s(body.country).trim();

    // ---- address
    if (body.address && typeof body.address === "object") {
      const a = body.address;
      if ("fullAddress" in a)
        update["address.fullAddress"] = trimOrNull(a.fullAddress);
      if ("city" in a) update["address.city"] = trimOrNull(a.city);
      if ("state" in a) update["address.state"] = trimOrNull(a.state);
      if ("country" in a) update["address.country"] = trimOrNull(a.country);
      if ("zip" in a) update["address.zip"] = trimOrNull(a.zip);
    }

    // ---- contact
    if (body.contact && typeof body.contact === "object") {
      const c = body.contact;
      if ("phone" in c) update["contact.phone"] = trimOrNull(c.phone);
      if ("email" in c) update["contact.email"] = trimOrNull(c.email);
      if ("website" in c) update["contact.website"] = trimOrNull(c.website);
      if ("facebook" in c) update["contact.facebook"] = trimOrNull(c.facebook);
      if ("instagram" in c)
        update["contact.instagram"] = trimOrNull(c.instagram);
      if ("linkedin" in c) update["contact.linkedin"] = trimOrNull(c.linkedin);
    }

    // ---- education (array)
    if ("education" in body) {
      const edu = sanitizeEducation(body.education);
      // যদি ইউজার সব ডিলিট করে empty পাঠায়, সেটাও save হবে
      update.education = Array.isArray(edu) ? edu : [];
    }

    // ✅ Nothing to update
    if (!Object.keys(update).length) {
      return res.json({ ok: true, message: "Nothing to update" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });

    return res.json({
      ok: true,
      message: "Profile updated",
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        cover: user.cover,
        country: user.country,
        address: user.address,
        contact: user.contact,
        education: user.education,
      },
    });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Update failed" });
  }
};

// @desc    Search users by name, email, or username
// @route   GET /api/users/search?search=keyword
// @access  Private/Public (আপনার প্রয়োজন অনুযায়ী)
export const searchUsers = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const { search } = req.body;
    
    // যদি কোনো সার্চ কি-ওয়ার্ড না পাঠানো হয়
    if (!search) {
      return res.status(400).json({
        success: false,
        message: "Search query parameter is required",
      });
    }

    // কেস-ইনসেনসিটিভ (Case-insensitive) রেগুলার এক্সপ্রেশন তৈরি
    const searchRegex = new RegExp(search, 'i');

    // Name, Email, অথবা Username-এর যেকোনো একটির সাথে মিললে ইউজার খুঁজে বের করবে
    const users = await User.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { username: searchRegex }
      ]
    })
    .select('name email username avatar role accountStatus avatar') 
    .limit(20); 

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });

  } catch (error) {
    console.error('Error in search api:', error);
    res.status(500).json({
      success: false,
      message: "Server Error. Could not search users.",
    });
  }
};

// ✅ common helper: cursor parse
const parseCursor = (raw) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

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

// ✅ 1) ME => my posts
export const getMyPosts = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const take = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const items = await Post.aggregate([
      {
        $match: {
          isDeleted: false,
          author: new mongoose.Types.ObjectId(me),
          ...cursorFilter,
        },
      },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: take },

      // populate author minimal
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: "$author" },

      // ✅ flags: my timeline => canEdit/canDelete always true
      {
        $addFields: {
          canEdit: true,
          canDelete: true,
          "author.isMe": true,
        },
      },

      {
        $project: {
          "author._id": 1,
          "author.name": 1,
          "author.username": 1,
          "author.avatar": 1,
          "author.coverPhoto": 1,
          "author.isMe": 1,

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
          category: 1,
          subCategory: 1,

          likeCount: 1,
          commentCount: 1,
          saveCount: 1,
          shareCount: 1,

          createdAt: 1,
          updatedAt: 1,

          canEdit: 1,
          canDelete: 1,
        },
      },
    ]);

    const nextCursor =
      items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            _id: items[items.length - 1]._id,
          }
        : null;

    return res.json({ success: true, items, nextCursor });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "My posts failed" });
  }
};

//delete my posts by id
export const deleteMyPost = async (req, res) => {
  try {
    const me = req.user?._id;
    
    if (!me)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id } = req.params;

    // ❌ invalid post id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid post id" });
    }

    /**
     * 🔐 SECURITY CHECK
     * - post exists
     * - post is NOT deleted
     * - post author MUST be current user
     */
    const post = await Post.findOne({
      _id: id,
      author: me, // 🔥 only creator can delete
      isDeleted: false,
    });

    if (!post) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this post",
      });
    }

    // ✅ soft delete
    post.isDeleted = true;
    post.deletedAt = new Date(); // optional
    await post.save();

    return res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Post delete failed",
    });
  }
};

//update my posts by id

export const updateMyPost = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id } = req.params;

    // ❌ invalid id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid post id" });
    }

    // 🔐 find only my post
    const post = await Post.findOne({
      _id: id,
      author: me,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    });

    if (!post) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this post",
      });
    }

    // ✅ allowed fields only (security)
    const {
      text,
      privacy,
      backgroundUrl,
      textStyle,
      layout,
    } = req.body;

    if (text !== undefined) post.text = text;
    if (privacy !== undefined) post.privacy = privacy;
    if (backgroundUrl !== undefined) post.backgroundUrl = backgroundUrl;
    if (textStyle !== undefined) post.textStyle = textStyle;
    if (layout !== undefined) post.layout = layout;

    await post.save();

    return res.json({
      success: true,
      message: "Post updated successfully",
      item: post,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Post update failed",
    });
  }
};

// ✅ 2) OTHER USER => only view
export const getUserPosts = async (req, res) => {
  try {
    const me = req.user?._id;
    const userId = req.params.userId;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    // user exists?
    const u = await User.findById(userId).select("_id").lean();
    if (!u) return res.status(404).json({ message: "User not found" });

    const take = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const items = await Post.aggregate([
      {
        $match: {
          isDeleted: false,
          author: new mongoose.Types.ObjectId(userId),
          ...cursorFilter,
        },
      },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: take },

      // populate author minimal
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: "$author" },

      // ✅ flags: other user => canEdit/canDelete false (unless it's me)
      {
        $addFields: {
          canEdit: me
            ? { $eq: ["$author._id", new mongoose.Types.ObjectId(me)] }
            : false,
          canDelete: me
            ? { $eq: ["$author._id", new mongoose.Types.ObjectId(me)] }
            : false,
          "author.isMe": me
            ? { $eq: ["$author._id", new mongoose.Types.ObjectId(me)] }
            : false,
        },
      },

      {
        $project: {
          "author._id": 1,
          "author.name": 1,
          "author.username": 1,
          "author.avatar": 1,
          "author.coverPhoto": 1,
          "author.isMe": 1,

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
          category: 1,
          subCategory: 1,

          likeCount: 1,
          commentCount: 1,
          saveCount: 1,
          shareCount: 1,

          createdAt: 1,
          updatedAt: 1,

          canEdit: 1,
          canDelete: 1,
        },
      },
    ]);

    const nextCursor =
      items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            _id: items[items.length - 1]._id,
          }
        : null;

    return res.json({ success: true, items, nextCursor });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "User posts failed" });
  }
};

// ✅ 3) ME => my photos (type=image)
export const getMyPhotos = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const take = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const items = await Post.aggregate([
      {
        $match: {
          isDeleted: false,
          author: new mongoose.Types.ObjectId(me),
          type: "image",
          ...cursorFilter,
        },
      },
      { $sort: { createdAt: -1, _id: -1 } },
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
          canEdit: true,
          canDelete: true,
          "author.isMe": true,
        },
      },

      {
        $project: {
          "author._id": 1,
          "author.name": 1,
          "author.username": 1,
          "author.avatar": 1,
          "author.coverPhoto": 1,
          "author.isMe": 1,

          type: 1,
          privacy: 1,
          text: 1,
          backgroundUrl: 1,
          textStyle: 1,
          medias: 1,
          layout: 1,

          likeCount: 1,
          commentCount: 1,
          saveCount: 1,
          shareCount: 1,

          createdAt: 1,
          updatedAt: 1,

          canEdit: 1,
          canDelete: 1,
        },
      },
    ]);

    const nextCursor =
      items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            _id: items[items.length - 1]._id,
          }
        : null;

    return res.json({ success: true, items, nextCursor });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "My photos failed" });
  }
};

// ✅ 4) OTHER USER => user photos (read-only unless me)
export const getUserPhotos = async (req, res) => {
  try {
    const me = req.user?._id;
    const userId = req.params.userId;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const u = await User.findById(userId).select("_id").lean();
    if (!u) return res.status(404).json({ message: "User not found" });

    const take = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const items = await Post.aggregate([
      {
        $match: {
          isDeleted: false,
          author: new mongoose.Types.ObjectId(userId),
          type: "image",
          ...cursorFilter,
        },
      },
      { $sort: { createdAt: -1, _id: -1 } },
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
          canEdit: me
            ? { $eq: ["$author._id", new mongoose.Types.ObjectId(me)] }
            : false,
          canDelete: me
            ? { $eq: ["$author._id", new mongoose.Types.ObjectId(me)] }
            : false,
          "author.isMe": me
            ? { $eq: ["$author._id", new mongoose.Types.ObjectId(me)] }
            : false,
        },
      },

      {
        $project: {
          "author._id": 1,
          "author.name": 1,
          "author.username": 1,
          "author.avatar": 1,
          "author.coverPhoto": 1,
          "author.isMe": 1,

          type: 1,
          privacy: 1,
          text: 1,
          backgroundUrl: 1,
          textStyle: 1,
          medias: 1,
          layout: 1,

          likeCount: 1,
          commentCount: 1,
          saveCount: 1,
          shareCount: 1,

          createdAt: 1,
          updatedAt: 1,

          canEdit: 1,
          canDelete: 1,
        },
      },
    ]);

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
      .json({ message: e?.message || "User photos failed" });
  }
};

// ✅ 5) ME => my reels (type=video + category=reels)
export const getMyReels = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const take = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const items = await Post.aggregate([
      {
        $match: {
          isDeleted: false,
          author: new mongoose.Types.ObjectId(me),
          type: "video",
          category: "reels",
          ...cursorFilter,
        },
      },
      { $sort: { createdAt: -1, _id: -1 } },
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
          canEdit: true,
          canDelete: true,
          "author.isMe": true,
        },
      },

      {
        $project: {
          "author._id": 1,
          "author.name": 1,
          "author.username": 1,
          "author.avatar": 1,
          "author.coverPhoto": 1,
          "author.isMe": 1,

          type: 1,
          privacy: 1,
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

          canEdit: 1,
          canDelete: 1,
        },
      },
    ]);

    const nextCursor =
      items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            _id: items[items.length - 1]._id,
          }
        : null;

    return res.json({ success: true, items, nextCursor });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "My reels failed" });
  }
};

// ✅ 6) OTHER USER => user reels (read-only unless me)
export const getUserReels = async (req, res) => {
  try {
    const me = req.user?._id;
    const userId = req.params.userId;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const u = await User.findById(userId).select("_id").lean();
    if (!u) return res.status(404).json({ message: "User not found" });

    const take = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const items = await Post.aggregate([
      {
        $match: {
          isDeleted: false,
          author: new mongoose.Types.ObjectId(userId),
          type: "video",
          category: "reels",
          ...cursorFilter,
        },
      },
      { $sort: { createdAt: -1, _id: -1 } },
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
          canEdit: me
            ? { $eq: ["$author._id", new mongoose.Types.ObjectId(me)] }
            : false,
          canDelete: me
            ? { $eq: ["$author._id", new mongoose.Types.ObjectId(me)] }
            : false,
          "author.isMe": me
            ? { $eq: ["$author._id", new mongoose.Types.ObjectId(me)] }
            : false,
        },
      },

      {
        $project: {
          "author._id": 1,
          "author.name": 1,
          "author.username": 1,
          "author.avatar": 1,
          "author.coverPhoto": 1,
          "author.isMe": 1,

          type: 1,
          privacy: 1,
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

          canEdit: 1,
          canDelete: 1,
        },
      },
    ]);

    const nextCursor =
      items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            _id: items[items.length - 1]._id,
          }
        : null;

    return res.json({ success: true, items, nextCursor });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "User reels failed" });
  }
};

// ✅ GET /posts/me/videos/general?limit=20&cursor=...

export const getMyVideos = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const take = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const items = await Post.aggregate([
      {
        $match: {
          isDeleted: false,
          author: new mongoose.Types.ObjectId(me),
          type: "video",
          category: "general",
          ...cursorFilter,
        },
      },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: take },

      // ১. ইউজার ডাটা lookup (এটি থাকবে কারণ লেখকের প্রোফাইল ডেটা রেন্ডার করতে হবে)
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: "$author" },

      // 🌟 ২. ঠিক করা হয়েছে: videoclicks এর জন্য করা জটিল $lookup এবং $addFields পুরোপুরি রিমুভ করা হয়েছে

      // ৩. ডাটা ফিল্ড মার্জ ও অ্যাড করা
      {
        $addFields: {
          canEdit: true,
          canDelete: true,
          "author.isMe": true,
          // videoClickCount এখন সরাসরি ডকুমেন্টে থাকায় এখানে নতুন করে এড করার কিছু নেই
        },
      },

      // ৪. ফাইনাল প্রজেকশন (আউটপুট ফিল্ড ফিল্টারিং)
      {
        $project: {
          "author._id": 1,
          "author.name": 1,
          "author.username": 1,
          "author.avatar": 1,
          "author.coverPhoto": 1,
          "author.isMe": 1,

          type: 1,
          privacy: 1,
          text: 1,
          description: 1,
          medias: 1,
          mutedByDefault: 1,
          loop: 1,
          videoMode: 1,
          category: 1,
          subCategory: 1,
          status: 1,

          likeCount: 1,
          commentCount: 1,
          saveCount: 1,
          shareCount: 1,
          viewCount: 1,
          videoClickCount: 1,
          updateReason: 1,

          createdAt: 1,
          updatedAt: 1,
          canEdit: 1,
          canDelete: 1,
        },
      },
    ]);

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
      .json({ message: e?.message || "My general videos failed" });
  }
};

// export const getMyVideos = async (req, res) => {
//   try {
//     const me = req.user?._id;
//     if (!me) return res.status(401).json({ message: "Unauthorized" });

//     const take = Math.min(Number(req.query.limit) || 20, 50);
//     const cursor = parseCursor(req.query.cursor);
//     const cursorFilter = buildCursorFilter(cursor);

//     // ✅ 1. get settings (earning rules)
//     const setting = await Setting.findOne();

//     const viewRate = setting?.viewRate || 0;
//     const likeRate = setting?.likeRate || 0;
//     const shareRate = setting?.shareRate || 0;
//     const commentRate = setting?.commentRate || 0;
//     const earningEnabled = setting?.earningEnabled ?? true;

//     const items = await Post.aggregate([
//       {
//         $match: {
//           isDeleted: false,
//           author: new mongoose.Types.ObjectId(me),
//           type: "video",
//           category: "general",
//           ...cursorFilter,
//         },
//       },
//       { $sort: { createdAt: -1, _id: -1 } },
//       { $limit: take },

//       {
//         $lookup: {
//           from: "users",
//           localField: "author",
//           foreignField: "_id",
//           as: "author",
//         },
//       },
//       { $unwind: "$author" },

//       // ✅ 2. ADD EARN CALCULATION
//       {
//         $addFields: {
//           canEdit: true,
//           canDelete: true,
//           "author.isMe": true,

//           earn: {
//             $cond: [
//               { $eq: [earningEnabled, true] },
//               {
//                 $round: [
//                   {
//                     $add: [
//                       {
//                         $multiply: [
//                           { $divide: ["$viewCount", 1000] },
//                           viewRate,
//                         ],
//                       },
//                       {
//                         $multiply: [
//                           { $divide: ["$likeCount", 1000] },
//                           likeRate,
//                         ],
//                       },
//                       {
//                         $multiply: [
//                           { $divide: ["$shareCount", 1000] },
//                           shareRate,
//                         ],
//                       },
//                       {
//                         $multiply: [
//                           { $divide: ["$commentCount", 1000] },
//                           commentRate,
//                         ],
//                       },
//                     ],
//                   },
//                   3,
//                 ],
//               },
//               0,
//             ],
//           },
//         },
//       },

//       // ✅ 3. PROJECT FIELDS
//       {
//         $project: {
//           "author._id": 1,
//           "author.name": 1,
//           "author.username": 1,
//           "author.avatar": 1,
//           "author.coverPhoto": 1,
//           "author.isMe": 1,

//           type: 1,
//           privacy: 1,
//           text: 1,
//           description: 1,
//           medias: 1,
//           mutedByDefault: 1,
//           loop: 1,
//           videoMode: 1,
//           category: 1,
//           subCategory: 1,

//           likeCount: 1,
//           commentCount: 1,
//           saveCount: 1,
//           shareCount: 1,
//           viewCount: 1,

//           // ✅ earning field send to frontend
//           earn: 1,

//           createdAt: 1,
//           updatedAt: 1,
//           canEdit: 1,
//           canDelete: 1,
//         },
//       },
//     ]);

//     const totalEarned = items.reduce((sum, item) => {
//       return sum + (item.earn || 0);
//     }, 0);

//     await Wallet.findOneAndUpdate(
//       { me },
//       {
//         $inc: {
//           available: totalEarned,
//           totalEarned: totalEarned,
//         },
//       },
//       { new: true },
//     );

//     // cursor pagination
//     const nextCursor =
//       items.length > 0
//         ? {
//             createdAt: items[items.length - 1].createdAt,
//             _id: items[items.length - 1]._id,
//           }
//         : null;

//     return res.json({
//       success: true,
//       items,
//       nextCursor,
//     });
//   } catch (e) {
//     return res.status(500).json({
//       message: e?.message || "My general videos failed",
//     });
//   }
// };
