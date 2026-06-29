import Seller from "../../models/ecommarce/Seller.model.js"; // আপনার সঠিক পাথ অনুযায়ী পরিবর্তন করুন
import User from "../../models/user/user.model.js";

export const adminListSellers = async (req, res) => {
  try {
    const status = req.query.status;
    let filter = {};

    if (status) {
      filter.status = status;
    }

    const items = await Seller.find(filter)
      .sort({ createdAt: -1 })
      .populate("userId", "name username avatar email") // ইউজার কালেকশন থেকে ডাটা আনবে
      .lean();

    return res.status(200).json({ success: true, items });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: e?.message || "Failed to fetch list" });
  }
};

/**
 * ৪. নির্দিষ্ট একটি সেলার রিকোয়েস্ট বিস্তারিত দেখা (Admin Side)
 */
export const getSingleSellerRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Seller.findById(id)
      .populate("userId", "name username avatar email")
      .lean();

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Seller request not found" });
    }

    return res.status(200).json({ success: true, data: item });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: e?.message || "Internal server error" });
  }
};

/**
 * ৫. অ্যাডমিন দ্বারা সেলার স্ট্যাটাস পরিবর্তন (Admin Side)
 * এপ্রুভ, পেন্ডিং অথবা রিজেক্ট করার কন্ট্রোলার
 */
// export const adminSellerStatusUpdate = async (req, res) => {
//   try {
//     const adminId = req.user?._id;
//     const sellerRequestId = req.params.id;
//     const { status, reason } = req.body; // ফ্রন্টএন্ড বডি থেকে স্ট্যাটাস এবং রিজেক্ট রিজন নিন

//     // ভ্যালিডেশন চেক
//     const validStatuses = ["approved", "pending", "rejected"];
//     if (!status || !validStatuses.includes(status)) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid status provided" });
//     }

//     const sellerApp = await Seller.findById(sellerRequestId);
//     if (!sellerApp) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Application not found" });
//     }

//     // অলরেডি সেম স্ট্যাটাস থাকলে এরর রিটার্ন করবে
//     if (sellerApp.status === status) {
//       return res
//         .status(400)
//         .json({ success: false, message: `Application is already ${status}` });
//     }

//     // ✅ আপনার মডেল অনুযায়ী ডাইনামিক স্ট্যাটাস আপডেট
//     sellerApp.status = status;

//     // মডেলেরapprovedBy এবং approvedAt ফিল্ড আপডেট (স্ট্যাটাসapproved বা rejected যাই হোক)
//     sellerApp.approvedBy = adminId;
//     sellerApp.approvedAt = new Date();
//     // রিজেক্ট হলে রিজন সেভ হবে, অন্যথায় ফাঁকা স্ট্রিং বা নাল হবে (মডেলে default: "")
//     sellerApp.reason =
//       status === "rejected" ? reason || "Rejected by admin" : "";

//     const savedSeller = await sellerApp.save();
//     console.log("rakib3", savedSeller);

//     // ✅ ইউজারের প্রোফাইলে সেলার রোল এবং স্ট্যাটাস সিঙ্ক করা
//     const isApprovedSeller = status === "approved";
//      const updatedUser = await User.findByIdAndUpdate(
//        sellerApp.userId,
//        {
//          $set: {
//            sellerStatus: status,
//            isSeller: isApprovedSeller,
//            role: isApprovedSeller ? "SELLER" : "USER",
//          },
//        },
//        { new: true },
//      ); // নতুন আপডেট হওয়া ডাটা দেখতে চাইলে { new: true } দিতে পারেন

//      console.log("user res", updatedUser);

//     return res.status(200).json({
//       success: true,
//       message: `Seller status updated to ${status}`,
//       data: sellerApp,
//     });
//   } catch (e) {
//     return res
//       .status(500)
//       .json({ success: false, message: e?.message || "Status update failed" });
//   }
// };

export const adminSellerStatusUpdate = async (req, res) => {
  try {
    const adminId = req.user?._id;
    const sellerRequestId = req.params.id;
    const { status, reason } = req.body;

    // ১. ভ্যালিডেশন চেক
    const validStatuses = ["approved", "pending", "rejected"];
    if (!status || !validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status provided" });
    }

    // ২. অ্যাপ্লিকেশনটি আদৌ আছে কি না চেক করা
    const sellerApp = await Seller.findById(sellerRequestId);
    if (!sellerApp) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    if (sellerApp.status === status) {
      return res
        .status(400)
        .json({ success: false, message: `Application is already ${status}` });
    }

    // ৩. ✅ .save() বাদ দিয়ে সরাসরি findByIdAndUpdate ব্যবহার করুন
    const updatedSellerApp = await Seller.findByIdAndUpdate(
      sellerRequestId,
      {
        $set: {
          status: status,
          approvedBy: adminId,
          approvedAt: new Date(),
          reason: status === "rejected" ? reason || "Rejected by admin" : "",
        },
      },
      { new: true }, // এটি ডাটাবেজে আপডেট হওয়া নতুন ডাটা রিটার্ন করবে
    );

   

    // ৪. ইউজারের প্রোফাইলে সেলার রোল এবং স্ট্যাটাস সিঙ্ক করা
    const isApprovedSeller = status === "approved";
    const updatedUser = await User.findByIdAndUpdate(
      sellerApp.userId, // এখানে আগের মতোই sellerApp.userId কাজ করবে
      {
        $set: {
          sellerStatus: status,
          isSeller: isApprovedSeller,
          role: isApprovedSeller ? "SELLER" : "USER",
        },
      },
      { new: true },
    );

  

    // ৫. ফ্রন্টএন্ডে রেসপন্স পাঠানো (এখানে আসল res অবজেক্ট একদম ঠিক আছে)
    return res.status(200).json({
      success: true,
      message: `Seller status updated to ${status}`,
      data: updatedSellerApp,
    });
  } catch (e) {
    console.error("Catch Block Error:", e);
    return res
      .status(500)
      .json({ success: false, message: e?.message || "Status update failed" });
  }
};