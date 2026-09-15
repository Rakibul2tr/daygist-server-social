// controllers/ecommerce/sellerModerator.controller.js
import User from "../../models/user/user.model.js";
import Seller from "../../models/ecommarce/Seller.model.js"; // আপনার সেলার মডেলের পাথ

// ১. সেলারের আন্ডারে নতুন শপ মডারেটর তৈরি
export const createShopModerator = async (req, res) => {
  try {
    // ১. রিকোয়েস্টকারী সেলার কিনা চেক
    if (req.user.role !== "SELLER") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only sellers can create shop moderators.",
      });
    }

    // ২. এই সেলারের নিজস্ব শপ প্রোফাইলটি approved কিনা চেক
    const shop = await Seller.findOne({
      userId: req.user._id,
      isDeleted: false,
    });
    if (!shop || shop.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Your shop profile is not approved yet.",
      });
    }

    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    // 🎯 ৩. ইমেইল দিয়ে এক্সিস্টিং ইউজারকে খুঁজে বের করা
    const user = await User.findOne({ email });

    // ইউজার যদি ডাটাবেজেই না থাকে
    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found with this email. Please ask them to sign up first.",
      });
    }

    // 🔐 ৪. সিকিউরিটি চেক: ইউজার অলরেডি অ্যাডমিন বা অন্য কোনো বড় রোলে আছে কিনা
    if (user.role === "ADMIN" || user.role === "SUPPER ADMIN") {
      return res.status(400).json({
        success: false,
        message: "You cannot make an Admin or Super Admin your shop moderator!",
      });
    }

    if (user.role === "SELLER") {
      return res.status(400).json({
        success: false,
        message: "This user is already a Seller of another shop.",
      });
    }

    // ইউজার যদি অলরেডি মডারেটর হয় এবং তার অন্য কোনো সেলার আইডি থাকে
    if (
      user.role === "MODERATOR" &&
      user.sellerId &&
      String(user.sellerId) !== String(shop._id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This user is already working as a moderator for another shop.",
      });
    }

    // 🔄 ৫. ইউজারের ডাটা আপডেট করে শপ মডারেটর বানানো
    user.role = "MODERATOR";
    user.moderatorStatus = "active";
    user.sellerId = shop.userId; // 🎯 এই মডারেটরের গায়ে আপনার শপের আইডি সেট হলো

    // শপ মডারেটরের ডিফল্ট রাউট পারমিশন (যেমন অর্ডার দেখা ও আপডেট করা)
    user.permissions = ["/all-orders", "/update-order"];

    await user.save();

    res.status(200).json({
      success: true,
      message: "User successfully assigned as Shop Moderator",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        shopName: shop.shopName,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ২. সেলার তার নিজের দোকানের মডারেটরদের লিস্ট দেখবে
export const getShopModerators = async (req, res) => {
  try {
    if (req.user.role !== "SELLER") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const shop = await Seller.findOne({
      userId: req.user._id,
      isDeleted: false,
    });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    // শুধু এই শপের মডারেটরদের ফিল্টার করে আনা
    const moderators = await User.find({
      role: "MODERATOR",
      sellerId: shop.userId,
    }).select("-password -__v");

    res.json({ success: true, data: moderators });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ৩. সেলার তার মডারেটরের স্ট্যাটাস (active/inactive) পরিবর্তন করবে
export const updateShopModeratorStatus = async (req, res) => {
  try {
    if (req.user.role !== "SELLER") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    const { status } = req.body; // ফ্রন্টএন্ড থেকে "active" অথবা "inactive" আসবে

    if (!["active", "inactive"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const shop = await Seller.findOne({
      userId: req.user._id,
      isDeleted: false,
    });

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    // নিরাপত্তা চেক: এই মডারেটরটি সত্যি এই সেলারের দোকানের কি না (মালিকের userId দিয়ে ম্যাচিং)
    const moderator = await User.findOne({ _id: id, sellerId: shop.userId });

    if (!moderator) {
      return res
        .status(404)
        .json({ success: false, message: "Moderator not found in your shop" });
    }

    // 🎯 মেইন ফিক্স: ইনঅ্যাক্টিভ করলে রোল পরিবর্তন করে USER বানানো এবং শপ থেকে রিমুভ করা
    if (status === "inactive") {
      moderator.role = "USER"; // মডারেটর থেকে সাধারণ কাস্টমার বানানো হলো
      moderator.moderatorStatus = "inactive";
      moderator.sellerId = null; // শপের লিঙ্ক কেটে দেওয়া হলো
      moderator.permissions = []; // সব পারমিশন মুছে দেওয়া হলো
    } else {
      // যদি আবার একটিভ করা হয় (সেফটি ব্যাকআপ লজিক)
      moderator.role = "MODERATOR";
      moderator.moderatorStatus = "active";
      moderator.sellerId = shop.userId;
      moderator.permissions = ["/all-orders", "/update-order"];
    }

    await moderator.save();

    res.json({
      success: true,
      message:
        status === "inactive"
          ? "Moderator removed and converted back to a regular USER successfully."
          : `Shop moderator status updated to ${status}`,
      data: moderator,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

