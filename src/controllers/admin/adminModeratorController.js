// controllers/adminModeratorController.js
import User from "../../models/user/user.model.js"; // আপনার ইউজার মডেলের পাথ
import Order from "../../models/ecommarce/Order.model.js";
// ১. নতুন মডারেটর তৈরি করা
// ১. নতুন মডারেটর তৈরি করা (পাসওয়ার্ড ছাড়া)
export const createModerator = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // ইমেইল অলরেডি ডাটাবেজে আছে কিনা চেক
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ ok: false, message: "Email already exists!" });
    }

    // নতুন মডারেটর তৈরি (ডিফল্ট রোল MODERATOR এবং স্ট্যাটাস active)
    const newModerator = new User({
      name,
      email,
      phone,
      role: "MODERATOR",
      moderatorStatus: "active",
      permissions: [] // শুরুতে কোনো পারমিশন থাকবে না
    });

    await newModerator.save();

    res.status(201).json({
      ok: true,
      message: "Moderator created successfully",
      data: { id: newModerator._id, name, email, phone, role: "MODERATOR" }
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};


// ২. সব মডারেটরের লিস্ট দেখা (অ্যাডমিন প্যানেলের জন্য)
export const getAllModerators = async (req, res) => {
  try {
    // শুধু যাদের রোল MODERATOR তাদের ডাটা আসবে (পাসওয়ার্ড ছাড়া)
    const moderators = await User.find({ role: "MODERATOR" }).select(
      "-password",
    );

    res.json({ ok: true, data: moderators });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

// ৩. মডারেটর অ্যাক্টিভ বা ইনঅ্যাক্টিভ করা
export const updateModeratorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // ফ্রন্টএন্ড থেকে "active" অথবা "inactive" আসবে

    if (!["active", "inactive"].includes(status)) {
      return res
        .status(400)
        .json({ ok: false, message: "Invalid status value" });
    }

    const updatedModerator = await User.findByIdAndUpdate(
      id,
      { moderatorStatus: status },
      { new: true },
    );

    if (!updatedModerator) {
      return res
        .status(404)
        .json({ ok: false, message: "Moderator not found" });
    }

    res.json({
      ok: true,
      message: `Moderator status updated to ${status}`,
      data: updatedModerator,
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

// ৪. মডারেটরের পারমিশন দেওয়া বা আপডেট করা (ডায়নামিক রাউট অ্যারে)
export const updateModeratorPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body; // ফ্রন্টএন্ড থেকে অ্যারে আসবে। যেমন: ["/all-orders", "/update-product"]

    if (!Array.isArray(permissions)) {
      return res
        .status(400)
        .json({ ok: false, message: "Permissions must be an array" });
    }

    const updatedModerator = await User.findByIdAndUpdate(
      id,
      { permissions: permissions },
      { new: true },
    );

    if (!updatedModerator) {
      return res
        .status(404)
        .json({ ok: false, message: "Moderator not found" });
    }

    res.json({
      ok: true,
      message: "Permissions updated successfully",
      data: updatedModerator,
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};


export const getAllOrdersForAdminModerator = async (req, res) => {

  
  try {
    // ১. ফ্রন্টএন্ড থেকে আসা পেজিনেশন ও ফিল্টার প্যারামিটার রিসিভ করা
    const page = Math.max(Number(req.query?.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query?.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const search = String(req.query?.q || "").trim(); // ফ্রন্টএন্ডে 'q' পাঠানো হচ্ছে
    const status = String(req.query?.status || "").trim();
    const sort = String(req.query?.sort || "").trim();

    let query = {};

    // ২. মডারেটরের জন্য কাস্টম রোল ফিল্টার
    if (req.user.role === "MODERATOR") {
      query.assignedModerator = req.user._id;
    }

    // ৩. ডায়নামিক সার্চ ফিল্টার (কাস্টমার নেম বা ফোন নম্বর দিয়ে সার্চ)
    if (search) {
      query.$or = [
        { "address.name": { $regex: search, $options: "i" } },
        { "address.phone": { $regex: search, $options: "i" } },
      ];
    }

    // ৪. স্ট্যাটাস ফিল্টার (যেমন: pending, delivered)
    if (status) {
      query.status = status;
    }

    // ৫. সর্টিং অর্ডার সেটআপ
    let sortOption = { createdAt: -1 }; // ডিফল্ট নতুন অর্ডার আগে দেখাবে
    if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    }

    // ৬. ডাটা কোয়েরি এবং টোটাল কাউন্ট একসাথে করা (Performance Optimization)
     const [orders, total] = await Promise.all([
       Order.find(query)
         .populate("assignedModerator", "name email") // মডারেটর ইনফো পপুলেট
         .populate({
           path: "items.productId", // অর্ডারের items অ্যারের ভেতর থেকে productId-তে ঢুকবে
           select: "title thumbnail price finalPrice", // প্রোডাক্ট মডেল থেকে এই ফিল্ডগুলো তুলে আনবে
           model: "EcomProduct", // আপনার প্রোডাক্ট মডেলের আসল নাম (স্কিমা অনুযায়ী নিশ্চিত করুন)
         })
         .sort(sortOption)
         .skip(skip)
         .limit(limit)
         .lean(),
       Order.countDocuments(query),
     ]);

    // 💡 ফ্রন্টএন্ডের রিকোয়ারমেন্ট অনুযায়ী meta অবজেক্ট সহ রেসপন্স পাঠানো
    return res.json({
      ok: true,
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getAllOrdersForAdminModerator Error:", error.message);
    return res.status(500).json({ ok: false, message: error.message });
  }
};


export const getOrderDetailsForAdminModerator = async (req, res) => {
  try {
    const { id } = req.params;

    // ১. প্রথমে আইডি দিয়ে অর্ডারটি ডাটাবেজ থেকে খুঁজে বের করুন (এবং মডারেটরের তথ্য পপুলেট করুন)
    const order = await Order.findById(id)
      .populate("assignedModerator", "name email")
      .lean();

    if (!order) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    // ২. 🔐 অ্যাক্সেস কন্ট্রোল সিকিউরিটি চেক

    // ইউজার যদি মডারেটর হয়, তবে চেক করবে এই অর্ডারটি তাকে অ্যাসাইন করা হয়েছে কি না
    if (req.user.role === "MODERATOR") {
      const isAssignedToMe =
        order.assignedModerator &&
        String(order.assignedModerator._id || order.assignedModerator) ===
          String(req.user._id);

      if (!isAssignedToMe) {
        return res.status(403).json({
          ok: false,
          message: "Access denied: This order is not assigned to you",
        });
      }
    }

    // ইউজার যদি নরমাল কাস্টমার/ইউজার হয়, তবে চেক করবে এটা তার নিজের অর্ডার কি না
    else if (req.user.role === "USER") {
      if (String(order.userId) !== String(req.user._id)) {
        return res.status(403).json({ ok: false, message: "Access denied" });
      }
    }

    // 💡 ইউজার ADMIN বা SUPPER ADMIN হলে ওপরের কোনো কন্ডিশনে আটকাবে না, সরাসরি সব ডাটা পেয়ে যাবে

    // ৩. সফল রেসপন্স পাঠানো
    res.json({ ok: true, data: order });
  } catch (err) {
    console.error("getOrderDetails error", err);
    res.status(500).json({ ok: false, message: "Failed to fetch order" });
  }
};
