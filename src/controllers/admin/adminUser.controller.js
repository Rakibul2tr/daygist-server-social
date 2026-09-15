// FILE: src/controllers/admin/adminUser.controller.js
import mongoose from "mongoose";
import User from "../../models/user/user.model.js"; // ✅ path তোমার project অনুযায়ী ঠিক করো
import { verifyGoogleToken } from "../../utils/googleVerify.js";
import { generateToken } from "../../utils/jwt.js";

const norm = (v) => (v == null ? "" : String(v).trim());
const up = (v) => norm(v).toUpperCase();
const ALLOWED_ROLES = ["USER", "ADMIN", "SELLER", "MODERATOR", "SUPPER ADMIN"];
const generateUsername = (email) => {
  const base = String(email || "admin").split("@")[0];
  return `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
};

// login or signup
// login or signup for both Admin and Moderator
export const googleAdminLoginOrCreate = async (req, res) => {
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

    // ✅ শুধুমাত্র এই ইমেইলগুলো নতুন অ্যাডমিন হিসেবে সাইন-আপ/লগইন করতে পারবে
    const allowedAdminEmails = [
      "rakibul2tr@gmail.com",
      "owner@gmail.com",
      "beyondtraces.official@gmail.com",
      "stillbux@gmail.com",
    ];

    // ডাটাবেজে অলরেডি এই ইমেইলের কোনো ইউজার (Admin বা Moderator) আছে কিনা চেক করুন
    let user = await User.findOne({ email });

    // ১. ইউজার যদি ডাটাবেজে না থাকে (নতুন ইউজার)
    if (!user) {
      // সে যদি এলাউড অ্যাডমিন লিস্টে না থাকে, তবে তাকে মডারেটর বা অ্যাডমিন কোনোভাবেই ঢুকতে দেওয়া হবে না
      if (!allowedAdminEmails.includes(email)) {
        return res.status(403).json({
          success: false,
          message: "This Google account is not usable",
        });
      }

      // লিস্টে থাকলে নতুন ADMIN হিসেবে অ্যাকাউন্ট তৈরি হবে
      user = await User.create({
        googleId: sub,
        email,
        name: name,
        avatar: {
          url: picture || null,
          key: null,
          provider: "google",
        },
        username: generateUsername(email),
        role: "ADMIN",
        profileCompleted: true,
        isNewUser: false,
        accountStatus: "active",
      });
    } 
    // ২. ইউজার যদি ডাটাবেজে অলরেডি থাকে (অ্যাডমিন আগে ক্রিয়েট করেছে অথবা পুরাতন অ্যাডমিন)
    else {
      // যদি লগইন করা ইউজারটি MODERATOR হয়
      if (user.role === "MODERATOR") {
        // মডারেটর অ্যাকাউন্টটি ইনঅ্যাক্টিভ করা থাকলে লগইন ব্লক করুন
        if (user.moderatorStatus === "inactive") {
          return res.status(403).json({
            success: false,
            message: "Your Moderator account is inactive. Contact Admin.",
          });
        }
      } 
      // যদি লগইন করা ইউজার মডারেটর না হয়, এবং তার ইমেইল এলাউড লিস্টেও না থাকে (সেফটি চেক)
      else if (!allowedAdminEmails.includes(email) && user.role !== "SUPPER ADMIN") {
        return res.status(403).json({
          success: false,
          message: "Access denied. You do not have permission to log in.",
        });
      }

      // গুগলের তথ্য দিয়ে প্রোফাইল সিঙ্ক/আপডেট করা
      if (!user.googleId) {
        user.googleId = sub;
      }

      if (!user.name && name) {
        user.name = name;
      }

      if (picture && !user.avatar?.url) {
        user.avatar = {
          url: picture,
          key: null,
          provider: "google",
        };
      }

      // ⚠️ আগে এখানে সবার রোল জোর করে 'ADMIN' করে দেওয়া হতো। 
      // এখন ইউজার মডারেটর হলে তার রোল মডারেটরি থাকবে, পরিবর্তন হবে না।
      if (user.role !== "MODERATOR") {
        user.role = "ADMIN"; // মডারেটর না হলে এবং ওপরে ফিল্টার পাস করলে সে অ্যাডমিন
      }
      
      user.accountStatus = "active";
      await user.save();
    }

    // টোকেন জেনারেট করা (ইউজারের নিজস্ব রোল অনুযায়ী - ADMIN বা MODERATOR)
    const token = generateToken({
      userId: user._id,
      role: user.role,
      profileCompleted: user.profileCompleted,
    });

    console.log('Logged in user info:', user);

    return res.status(200).json({
      success: true,
      message: `${user.role === "MODERATOR" ? "Moderator" : "Admin"} login successful`,
      token,
      user,
    });

  } catch (error) {
    console.log("googleAdminLoginOrCreate error:", error?.message || error);

    return res.status(401).json({
      success: false,
      message: "Invalid Google token",
      error: String(error?.message || error),
    });
  }
};

// get all users
export const adminGetAllUsers = async (req, res) => {
  try {
    const page = Math.max(Number(req.query?.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query?.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const search = String(req.query?.search || "").trim();
    const role = String(req.query?.role || "")
      .trim()
      .toUpperCase();
    const isBlocked = req.query?.isBlocked;
    const isDeleted = req.query?.isDeleted;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      query.role = role;
    }

    if (typeof isBlocked !== "undefined") {
      query.isBlocked = isBlocked === "true";
    }

    if (typeof isDeleted !== "undefined") {
      query.isDeleted = isDeleted === "true";
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password -googleId -__v")
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return res.json({
      ok: true,
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      message: e?.message || "Failed",
    });
  }
};

// GET /admin/users?page=1&limit=10
// GET /admin/users?page=1&limit=10&search=rakib
// GET /admin/users?page=1&limit=10&role=ADMIN
// GET /admin/users?page=1&limit=10&isBlocked=true
// GET /admin/users?page=1&limit=10&isDeleted=false
// GET /admin/users?page=1&limit=10&search=rakib&role=USER&isBlocked=false

// get user by id
export const adminGetUserById = async (req, res) => {
  try {
    const id = req.params?.id;
    const user = await User.findById(id)
      .select("-password -googleId -__v")
      .lean();
    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });
    return res.json({ ok: true, data: user });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};

// all status update in 1 api
export const adminUpdateUserControls = async (req, res) => {
  try {
    
    
    const id = req.params?.id;
    const {
      role,
      isBlocked,
      isDeleted,
      forceLogout,
      accountStatus,
      moderatorStatus,
    } = req.body || {};
      
   if (!mongoose.Types.ObjectId.isValid(id)) {
     return res.status(400).json({
       ok: false,
       message: "Invalid user id",
     });
   }


   const user = await User.findById(id);
   if (!user) {
     return res.status(404).json({
       ok: false,
       message: "User not found",
     });
   }


    // optional self protection
    if (String(req.user?._id) === String(id)) {
      if (typeof isBlocked === "boolean" && isBlocked === true) {
        return res.status(400).json({
          ok: false,
          message: "You cannot block yourself",
        });
      }

      if (typeof isDeleted === "boolean" && isDeleted === true) {
        return res.status(400).json({
          ok: false,
          message: "You cannot delete yourself",
        });
      }

      if (forceLogout === true) {
        return res.status(400).json({
          ok: false,
          message: "You cannot force logout yourself",
        });
      }
    }

    // role update
    if (typeof role !== "undefined") {
      const normalizedRole = String(role).trim().toUpperCase();
      // console.log("normalizedRole", normalizedRole);
      

      if (!ALLOWED_ROLES.includes(normalizedRole)) {
        return res.status(400).json({
          ok: false,
          message: "Invalid role",
        });
      }

      user.role = normalizedRole;
    }
      if (typeof moderatorStatus !== "undefined") {
        const normalizedStatus = String(moderatorStatus).trim().toLowerCase();

        // স্কিমা অনুযায়ী শুধুমাত্র active অথবা inactive এলাউড
        if (!["active", "inactive"].includes(normalizedStatus)) {
          return res.status(400).json({
            ok: false,
            message: "Invalid moderator status value",
          });
        }

        user.moderatorStatus = normalizedStatus;
      }

    // block/unblock
    if (typeof isBlocked === "boolean") {
      user.isBlocked = isBlocked;
      user.blockedAt = isBlocked ? new Date() : null;
    }

    // delete/restore
    if (typeof isDeleted === "boolean") {
      user.isDeleted = isDeleted;
      user.deletedAt = isDeleted ? new Date() : null;
    }

    // force logout
    if (forceLogout === true) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }
    // account status update
    if (typeof accountStatus !== "undefined") {
      const normalizedStatus = String(accountStatus).trim().toLowerCase();

      const allowedStatus = [
        "pending",
        "verified",
        "active",
        "rejected",
        "suspended",
        "deleted",
      ];

      if (!allowedStatus.includes(normalizedStatus)) {
        return res.status(400).json({
          ok: false,
          message: "Invalid status",
        });
      }

      user.accountStatus = normalizedStatus;
    }

    await user.save();

    const updatedUser = await User.findById(id).select("-googleId -__v").lean();

    return res.json({
      ok: true,
      message: "User controls updated successfully",
      data: updatedUser,
    });
  } catch (e) {
    console.log("adminUpdateUserControls error:", e?.message || e)
    return res.status(500).json({
      ok: false,
      message: e?.message || "Update failed",
      
    });
  }
}; 

// over view api users count,delete, blocks,sellers,monetization etc
export const adminOverview = async (req, res) => {
  try {
    const [
      allUsers,
      pendingUsers,
      blockedUsers,
      sellerUsers,
      monetizationUsers,
      deletedUsers,
      adminCount, // নতুন অ্যাডমিন কাউন্ট
      moderatorCount, // নতুন মডারেটর কাউন্ট
    ] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      User.countDocuments({
        isDeleted: { $ne: true },
        profileCompleted: false,
      }),
      User.countDocuments({
        isDeleted: { $ne: true },
        isBlocked: true,
      }),
      User.countDocuments({
        isDeleted: { $ne: true },
        isSeller: true,
      }),
      User.countDocuments({
        isDeleted: { $ne: true },
        isMonetization: true,
      }),
      User.countDocuments({
        isDeleted: true,
      }),
      User.countDocuments({ isDeleted: { $ne: true }, role: "ADMIN" }),
      User.countDocuments({ isDeleted: { $ne: true }, role: "MODERATOR" }),
    ]);

    return res.status(200).json({
      ok: true,
      message: "Admin overview fetched successfully",
      data: {
        allUsers,
        pendingUsers,
        blockedUsers,
        sellerUsers,
        monetizationUsers,
        deletedUsers,
        adminCount,
        moderatorCount,
      },
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      message: e?.message || "Failed to fetch admin overview",
    });
  }
};

export const getUsersByRole = async (req, res) => {
  try {
    // ১. কুয়েরি প্যারামস থেকে রোল এবং পেজিনেশন ডাটা নিন
    const { role, page = 1, limit = 10 } = req.query;

    // ২. ফিল্টার অবজেক্ট তৈরি (যদি রোল পাঠানো হয় তবেই সেটা দিয়ে ফিল্টার করবে)
    const filter = {};
    if (role) {
      filter.role = role.toUpperCase(); // API তে ছোট হাতের লিখলেও বড় হাতের করে নিবে (যেমন: user -> USER)
    }

    // ৩. ডাটাবেস থেকে ডাটা ফেচ করা
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(filter)
      .sort({ createdAt: -1 }) // নতুন ইউজার আগে দেখাবে
      .skip(skip)
      .limit(parseInt(limit));

    // ৪. টোটাল ইউজারের সংখ্যা বের করা (পেজিনেশনের জন্য দরকার)
    const totalUsers = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: parseInt(page),
      },
      data: users,
    });
  } catch (error) {
    console.error("Error in getUsersByRole:", error);
    res.status(500).json({
      success: false,
      message: "Server Error: Could not fetch users",
      error: error.message,
    });
  }
};


// // ✅ Role change
// export const adminSetUserRole = async (req, res) => {
//   try {
//     const id = req.params?.id;
//     const role = up(req.body?.role);

//     // adjust roles list as your app needs
//     const ALLOWED = ["USER", "ADMIN", "MODERATOR"];
//     if (!ALLOWED.includes(role)) {
//       return res.status(400).json({ ok: false, message: "Invalid role" });
//     }

//     // prevent self-demote if you want
//     if (String(req.user?._id) === String(id) && role !== "ADMIN") {
//       return res
//         .status(400)
//         .json({ ok: false, message: "You cannot change your own role" });
//     }

//     const user = await User.findByIdAndUpdate(
//       id,
//       { $set: { role } },
//       { new: true },
//     )
//       .select("-password -googleId -__v")
//       .lean();

//     if (!user)
//       return res.status(404).json({ ok: false, message: "User not found" });

//     return res.json({ ok: true, message: "Role updated", data: user });
//   } catch (e) {
//     return res
//       .status(500)
//       .json({ ok: false, message: e?.message || "Role update failed" });
//   }
// };

// // ✅ Block / Unblock (requires User schema field: isBlocked)
// export const adminSetUserBlocked = async (req, res) => {
//   try {
//     const id = req.params?.id;
//     const blocked = Boolean(req.body?.blocked);

//     // prevent blocking self (optional)
//     if (String(req.user?._id) === String(id) && blocked) {
//       return res
//         .status(400)
//         .json({ ok: false, message: "You cannot block yourself" });
//     }

//     const user = await User.findByIdAndUpdate(
//       id,
//       { $set: { isBlocked: blocked } },
//       { new: true },
//     )
//       .select("-password -googleId -__v")
//       .lean();

//     if (!user)
//       return res.status(404).json({ ok: false, message: "User not found" });

//     return res.json({
//       ok: true,
//       message: blocked ? "User blocked" : "User unblocked",
//       data: user,
//     });
//   } catch (e) {
//     return res
//       .status(500)
//       .json({ ok: false, message: e?._toggle || e?.message || "Failed" });
//   }
// };

// // ✅ Verify / Unverify (requires User schema field: isVerified)
// export const adminSetUserVerified = async (req, res) => {
//   try {
//     const id = req.params?.id;
//     const verified = Boolean(req.body?.verified);

//     const user = await User.findByIdAndUpdate(
//       id,
//       { $set: { isVerified: verified } },
//       { new: true },
//     )
//       .select("-password -googleId -__v")
//       .lean();

//     if (!user)
//       return res.status(404).json({ ok: false, message: "User not found" });

//     return res.json({
//       ok: true,
//       message: verified ? "User verified" : "User unverified",
//       data: user,
//     });
//   } catch (e) {
//     return res.status(500).json({ ok: false, message: e?.message || "Failed" });
//   }
// };

// // ✅ Soft delete user (requires field: isDeleted)
// export const adminDeleteUser = async (req, res) => {
//   try {
//     const id = req.params?.id;

//     if (String(req.user?._id) === String(id)) {
//       return res
//         .status(400)
//         .json({ ok: false, message: "You cannot delete yourself" });
//     }

//     const user = await User.findByIdAndUpdate(
//       id,
//       { $set: { isDeleted: true } },
//       { new: true },
//     )
//       .select("-password -googleId -__v")
//       .lean();

//     if (!user)
//       return res.status(404).json({ ok: false, message: "User not found" });

//     return res.json({ ok: true, message: "User deleted", data: user });
//   } catch (e) {
//     return res
//       .status(500)
//       .json({ ok: false, message: e?.message || "Delete failed" });
//   }
// };

// // ✅ Restore user (requires field: isDeleted)
// export const adminRestoreUser = async (req, res) => {
//   try {
//     const id = req.params?.id;

//     const user = await User.findByIdAndUpdate(
//       id,
//       { $set: { isDeleted: false } },
//       { new: true },
//     )
//       .select("-password -googleId -__v")
//       .lean();

//     if (!user)
//       return res.status(404).json({ ok: false, message: "User not found" });

//     return res.json({ ok: true, message: "User restored", data: user });
//   } catch (e) {
//     return res
//       .status(500)
//       .json({ ok: false, message: e?.message || "Restore failed" });
//   }
// };

// // ✅ Force logout (requires field: tokenVersion)
// // In your JWT sign you should include tokenVersion; protect checks it.
// export const adminForceLogoutUser = async (req, res) => {
//   try {
//     const id = req.params?.id;

//     // prevent forcing yourself (optional)
//     if (String(req.user?._id) === String(id)) {
//       return res
//         .status(400)
//         .json({ ok: false, message: "You cannot force logout yourself" });
//     }

//     const user = await User.findByIdAndUpdate(
//       id,
//       { $inc: { tokenVersion: 1 } },
//       { new: true },
//     )
//       .select("-password -googleId -__v")
//       .lean();

//     if (!user)
//       return res.status(404).json({ ok: false, message: "User not found" });

//     return res.json({
//       ok: true,
//       message: "User logged out (forced)",
//       data: user,
//     });
//   } catch (e) {
//     return res
//       .status(500)
//       .json({ ok: false, message: e?.message || "Force logout failed" });
//   }
// };
