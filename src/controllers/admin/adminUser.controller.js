// FILE: src/controllers/admin/adminUser.controller.js
import User from "../../models/user/user.model.js"; // ✅ path তোমার project অনুযায়ী ঠিক করো

const norm = (v) => (v == null ? "" : String(v).trim());
const up = (v) => norm(v).toUpperCase();

export const adminGetAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password -googleId -__v")
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    return res.json({ ok: true, data: users });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};

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

// ✅ Role change
export const adminSetUserRole = async (req, res) => {
  try {
    const id = req.params?.id;
    const role = up(req.body?.role);

    // adjust roles list as your app needs
    const ALLOWED = ["USER", "ADMIN", "MODERATOR"];
    if (!ALLOWED.includes(role)) {
      return res.status(400).json({ ok: false, message: "Invalid role" });
    }

    // prevent self-demote if you want
    if (String(req.user?._id) === String(id) && role !== "ADMIN") {
      return res
        .status(400)
        .json({ ok: false, message: "You cannot change your own role" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { role } },
      { new: true },
    )
      .select("-password -googleId -__v")
      .lean();

    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });

    return res.json({ ok: true, message: "Role updated", data: user });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Role update failed" });
  }
};

// ✅ Block / Unblock (requires User schema field: isBlocked)
export const adminSetUserBlocked = async (req, res) => {
  try {
    const id = req.params?.id;
    const blocked = Boolean(req.body?.blocked);

    // prevent blocking self (optional)
    if (String(req.user?._id) === String(id) && blocked) {
      return res
        .status(400)
        .json({ ok: false, message: "You cannot block yourself" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isBlocked: blocked } },
      { new: true },
    )
      .select("-password -googleId -__v")
      .lean();

    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });

    return res.json({
      ok: true,
      message: blocked ? "User blocked" : "User unblocked",
      data: user,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?._toggle || e?.message || "Failed" });
  }
};

// ✅ Verify / Unverify (requires User schema field: isVerified)
export const adminSetUserVerified = async (req, res) => {
  try {
    const id = req.params?.id;
    const verified = Boolean(req.body?.verified);

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isVerified: verified } },
      { new: true },
    )
      .select("-password -googleId -__v")
      .lean();

    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });

    return res.json({
      ok: true,
      message: verified ? "User verified" : "User unverified",
      data: user,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};

// ✅ Soft delete user (requires field: isDeleted)
export const adminDeleteUser = async (req, res) => {
  try {
    const id = req.params?.id;

    if (String(req.user?._id) === String(id)) {
      return res
        .status(400)
        .json({ ok: false, message: "You cannot delete yourself" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isDeleted: true } },
      { new: true },
    )
      .select("-password -googleId -__v")
      .lean();

    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });

    return res.json({ ok: true, message: "User deleted", data: user });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Delete failed" });
  }
};

// ✅ Restore user (requires field: isDeleted)
export const adminRestoreUser = async (req, res) => {
  try {
    const id = req.params?.id;

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isDeleted: false } },
      { new: true },
    )
      .select("-password -googleId -__v")
      .lean();

    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });

    return res.json({ ok: true, message: "User restored", data: user });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Restore failed" });
  }
};

// ✅ Force logout (requires field: tokenVersion)
// In your JWT sign you should include tokenVersion; protect checks it.
export const adminForceLogoutUser = async (req, res) => {
  try {
    const id = req.params?.id;

    // prevent forcing yourself (optional)
    if (String(req.user?._id) === String(id)) {
      return res
        .status(400)
        .json({ ok: false, message: "You cannot force logout yourself" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $inc: { tokenVersion: 1 } },
      { new: true },
    )
      .select("-password -googleId -__v")
      .lean();

    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });

    return res.json({
      ok: true,
      message: "User logged out (forced)",
      data: user,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Force logout failed" });
  }
};
