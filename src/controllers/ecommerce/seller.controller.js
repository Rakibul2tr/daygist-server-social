
import mongoose from "mongoose";
import EcomProduct from "../../models/ecommarce/EcomProduct.js";
import Order from "../../models/ecommarce/Order.model.js";
import Seller from "../../models/ecommarce/Seller.model.js";
import User from "../../models/user/user.model.js";
import Wallet from "../../models/wallet/wallet.model.js";

// ✅ User requests to become seller
export const requestSeller = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const {
      shopName,
      phone,
      address,
      district,
      businessType,

      nidNumber,
      nidFrontImage,
      nidBackImage,

      tradeLicense,

      logo,
      banner,
      description = "",

      acceptedTerms,
    } = req.body;

    if (!shopName?.trim())
      return res
        .status(400)
        .json({ success: false, message: "shopName required" });
    if (!phone?.trim())
      return res
        .status(400)
        .json({ success: false, message: "phone required" });

    if (!acceptedTerms) {
      return res.status(400).json({
        success: false,
        message: "You must accept seller terms & conditions",
      });
    }

    // ===== KYC validation =====
    if (businessType === "individual") {
      if (!nidNumber || !nidFrontImage || !nidBackImage) {
        return res.status(400).json({
          success: false,
          message: "NID number, front & back image required",
        });
      }
    }

    if (businessType === "business" && !tradeLicense) {
      return res.status(400).json({
        success: false,
        message: "Trade license required for business seller",
      });
    }

    const existing = await Seller.findOne({ userId, isDeleted: false }).lean();

    // already approved => stop
    if (existing?.status === "approved") {
      return res
        .status(400)
        .json({ success: false, message: "Already approved seller" });
    }

    const doc = await Seller.findOneAndUpdate(
      { userId },
      {
        $set: {
          shopName,
          phone,
          address,
          district,
          businessType,

          nidNumber: nidNumber || "",
          nidFrontImage: nidFrontImage || {
            key: "",
            url: "",
            provider: "wasabi",
          },
          nidBackImage: nidBackImage || {
            key: "",
            url: "",
            provider: "wasabi",
          },

          tradeLicense: tradeLicense || "",

          logo: logo || { key: "", url: "", provider: "wasabi" },
          banner: banner || { key: "", url: "", provider: "wasabi" },
          description,

          acceptedTerms: true,
          status: "pending",
          reason: "",
          isDeleted: false,
          approvedAt: null,
          approvedBy: null,
        },
      },
      { upsert: true, new: true },
    );

    res.json({ success: true, data: doc, message: "Seller request submitted" });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ✅ Seller can see own seller profile/status
// export const getMySellerInfo = async (req, res) => {
//   try {
//     const userId = req.user?._id;
//     if (!userId) {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }

//     // ✅ seller doc
//     const seller = await Seller.findOne({ userId, isDeleted: false }).lean();

//     console.log("🔍 [Debug]: Seller doc for userId", userId, "is:", seller);

//     // seller না থাকলে stats null/0 দিয়ে return
//     if (!seller) {
//       const wallet = await Wallet.findOne({ userId })
//         .select("available")
//         .lean();
//       return res.json({
//         success: true,
//         data: null,
//         status: {
//           productCount: 0,
//           completedOrdersCount: 0,
//           pendingOrdersCount: 0,
//           walletBalance: Number(wallet?.available || 0),
//         },
//       });
//     }

//     // ✅ IMPORTANT:
//     // - product এ যদি sellerId ফিল্ড থাকে -> sellerId ব্যবহার করো
//     // - order এ sellerId বা shopId যেটা আছে সেটাই ব্যবহার করো

//     const sellerId = seller.userId;

//     // তোমার order status naming অনুযায়ী এগুলো adjust করো
//     const COMPLETED = ["delivered", "completed"];
//     const PENDING = ["pending", "placed", "processing"];

//     const [productCount, completedOrdersCount, pendingOrdersCount, wallet] =
//       await Promise.all([
//         EcomProduct.countDocuments({
//           sellerId: sellerId, // ✅ product.sellerId
//           isDeleted: false,
//         }),

//         Order.countDocuments({
//           sellerId: sellerId, // ✅ order.sellerId (না থাকলে change করো)
//           status: { $in: COMPLETED },
//         }),

//         Order.countDocuments({
//           sellerId: sellerId,
//           status: { $in: PENDING },
//         }),

//         Wallet.findOne({ userId }).select("available").lean(),
//       ]);

//     // console.log("wallet", wallet);

//     return res.json({
//       success: true,
//       data: seller,
//       status: {
//         productCount,
//         completedOrdersCount,
//         pendingOrdersCount,
//         walletBalance: Number(wallet?.available || 0),
//       },
//     });
//   } catch (e) {
//     return res.status(500).json({ success: false, message: e.message });
//   }
// };
export const getMySellerInfo = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    let actualSellerUserId = null;

    // ====================================================================
    // 🔐 ১. সেলার বনাম মডারেটর অনুযায়ী শপের মালিকের ইউজার আইডি নির্ধারণ
    // ====================================================================
    if (userRole === "SELLER") {
      actualSellerUserId = userId;
    } else if (userRole === "MODERATOR") {
      if (req.user.moderatorStatus === "inactive" || !req.user.sellerId) {
        return res
          .status(403)
          .json({
            success: false,
            message: "Inactive or unlinked moderator account.",
          });
      }

      // মডারেটরের 'sellerId' (যা সেলারের userId) সরাসরি ব্যবহার করা হলো
      actualSellerUserId = new mongoose.Types.ObjectId(
        String(req.user.sellerId),
      );
    } else {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }

    // ✅ ২. প্রকৃত সেলারের আইডি দিয়ে শপ ডকুমেন্ট খুঁজে বের করা
    const seller = await Seller.findOne({
      userId: actualSellerUserId,
      isDeleted: false,
    }).lean();

    console.log(
      `🔍 [Debug Info Fetch]: Requested by ${userRole} | Target Seller UserID:`,
      actualSellerUserId,
    );

    // সেলার বা শপ প্রোফাইল না থাকলে ডিফল্ট ০ রিটার্ন
    if (!seller) {
      const wallet = await Wallet.findOne({ userId: actualSellerUserId })
        .select("available")
        .lean();
      return res.json({
        success: true,
        data: null,
        status: {
          productCount: 0,
          completedOrdersCount: 0,
          pendingOrdersCount: 0,
          walletBalance: Number(wallet?.available || 0),
        },
      });
    }

    const sellerId = seller.userId; // শপের ওনারের ইউজার আইডি
    const COMPLETED = ["delivered", "completed"];
    const PENDING = ["pending", "placed", "processing"];

    // ✅ ৩. ডাটা কাউন্ট ও ওয়ালেট ব্যালেন্স কোয়েরি (প্রকৃত মালিকের আইডি দিয়ে)
    const [productCount, completedOrdersCount, pendingOrdersCount, wallet] =
      await Promise.all([
        EcomProduct.countDocuments({
          sellerId: sellerId,
          isDeleted: false,
        }),

        Order.countDocuments({
          sellerId: sellerId,
          status: { $in: COMPLETED },
        }),

        Order.countDocuments({
          sellerId: sellerId,
          status: { $in: PENDING },
        }),

        // ওয়ালেট ব্যালেন্স মেইন সেলারের আইডি থেকে আসবে
        Wallet.findOne({ userId: sellerId }).select("available").lean(),
      ]);

    return res.json({
      success: true,
      data: seller, // শপের প্রোফাইল ইনফো (লোগো, নাম ইত্যাদি)
      status: {
        productCount,
        completedOrdersCount,
        pendingOrdersCount,
        walletBalance: Number(wallet?.available || 0), // ওনারের মেইন ওয়ালেট ব্যালেন্স
      },
    });
  } catch (e) {
    console.error("getMySellerInfo error", e);
    return res.status(500).json({ success: false, message: e.message });
  }
};


// ✅ Admin: list requests
export const adminGetSellerRequests = async (req, res) => {
  try {
    const { status = "pending", page = 1, limit = 20 } = req.query;

    const filter = { isDeleted: false };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Seller.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("userId", "name username profilePic") // optional
        .lean(),
      Seller.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items,
      meta: { page: Number(page), limit: Number(limit), total },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ✅ Admin: approve / reject
export const adminUpdateSellerStatus = async (req, res) => {
  try {
    const { status, reason = "" } = req.body;

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    // 1️⃣ Find seller request
    const seller = await Seller.findById(req.params.id);
    if (!seller || seller.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "Seller request not found" });
    }

    // 2️⃣ Prepare update
    seller.status = status;
    seller.reason = status === "rejected" ? reason : "";
    seller.approvedAt = status === "approved" ? new Date() : null;
    seller.approvedBy = status === "approved" ? req.user?._id : null;

    await seller.save();

    // 3️⃣ IMPORTANT: update User.isSeller
    if (status === "approved") {
      await User.findByIdAndUpdate(seller.userId, {
        $set: { isSeller: true },
      });
    }

    // optional: reject হলে seller role off করা
    if (status === "rejected") {
      await User.findByIdAndUpdate(seller.userId, {
        $set: { isSeller: false },
      });
    }

    res.json({
      success: true,
      data: seller,
      message: `Seller ${status}`,
    });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ✅ Admin: delete seller request/profile (soft delete)
export const adminDeleteSeller = async (req, res) => {
  try {
    const doc = await Seller.findByIdAndUpdate(
      req.params.id,
      { $set: { isDeleted: true } },
      { new: true },
    ).lean();

    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, message: "Seller deleted", data: doc });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// seller product get

// export const getMySellerOrders = async (req, res) => {
//   try {
//     const userId = req.user?._id;
//     if (!userId) return res.status(401).json({ message: "Unauthorized" });

//     const { status, page = 1, limit = 20 } = req.query;

//     // ✅ seller find
//     const seller = await Seller.findOne({ userId, isDeleted: false }).lean();
//     // console.log('seller',seller);
    
//     if (!seller) {
//       return res.json({
//         page: Number(page),
//         limit: Number(limit),
//         total: 0,
//         hasMore: false,
//         orders: [],
//       });
//     }

//     const sellerId = seller.userId; // তোমার code অনুযায়ী sellerId = seller.userId

//     const filter = { sellerId }; // ✅ Order.sellerId must exist
//     if (status) filter.status = String(status);

//     const skip = (Number(page) - 1) * Number(limit);

//     const [orders, total] = await Promise.all([
//       Order.find(filter)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(Number(limit))
//         .populate({
//           path: "userId",
//           select: "name username profilePic regNumber",
//         }) // buyer info
//         .populate({
//           path: "items.productId",
//           select: "title thumbnail price finalPrice discountPercent",
//         })
//         .lean(),
//       Order.countDocuments(filter),
//     ]);

//     console.log('orders',orders);
    

//     // ✅ normalize populated product snapshot like your user API
//     const enriched = orders.map((o) => ({
//       ...o,
//       items: (o.items || []).map((it) => {
//         const p = it.productId;
//         return {
//           ...it,
//           product: p
//             ? {
//                 _id: p._id,
//                 title: p.title,
//                 thumbnail: p.thumbnail,
//                 finalPrice: p.finalPrice,
//                 price: p.price,
//                 discountPercent: p.discountPercent,
//               }
//             : null,
//           productId: p?._id || it.productId,
//         };
//       }),
//     }));

//     return res.json({
//       page: Number(page),
//       limit: Number(limit),
//       total,
//       hasMore: skip + enriched.length < total,
//       orders: enriched,
//     });
//   } catch (err) {
//     console.error("getMySellerOrders error", err);
//     return res.status(500).json({ message: "Failed to fetch seller orders" });
//   }
// };

export const getMySellerOrders = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { status, page = 1, limit = 20 } = req.query;

    let targetSellerUserId = null;
    let isModeratorMode = false;

    if (userRole === "SELLER") {
      const seller = await Seller.findOne({ userId, isDeleted: false }).lean();
      if (!seller) {
        return res.json({
          page: Number(page),
          limit: Number(limit),
          total: 0,
          hasMore: false,
          orders: [],
        });
      }
      targetSellerUserId = seller.userId;
    } else if (userRole === "MODERATOR") {
      if (req.user.moderatorStatus === "inactive" || !req.user.sellerId) {
        return res
          .status(403)
          .json({
            message: "Access denied. Inactive or unlinked moderator account.",
          });
      }

      // 🎯 মেইন ফিক্স: findById এর বদলে findOne({ userId }) ব্যবহার করা হলো
      console.log(
        "🔍 [Debug]: Moderator req.user.sellerId is:",
        req.user.sellerId,
      );
      const linkedShop = await Seller.findOne({
        userId: req.user.sellerId,
        isDeleted: false,
      }).lean();

     

      if (!linkedShop) {
        return res
          .status(404)
          .json({
            message: "Linked shop profile not found for this moderator.",
          });
      }

      targetSellerUserId = linkedShop.userId;
      isModeratorMode = true;
    } else {
      return res
        .status(403)
        .json({ message: "Access denied: Sellers or Shop Staff only." });
    }

    // ফিল্টার অবজেক্ট
    const filter = { sellerId: targetSellerUserId };
    

    if (isModeratorMode) {
      filter.assignedModerator = userId; // শুধু মডারেটরের নিজের অর্ডার আসবে
    }

    if (status) filter.status = String(status);

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate({
          path: "userId",
          select: "name username profilePic regNumber",
        })
        .populate({
          path: "items.productId",
          select: "title thumbnail price finalPrice discountPercent",
        })
        .lean(),
      Order.countDocuments(filter),
    ]);

    const enriched = orders.map((o) => ({
      ...o,
      items: (o.items || []).map((it) => {
        const p = it.productId;
        return {
          ...it,
          product: p
            ? {
                _id: p._id,
                title: p.title,
                thumbnail: p.thumbnail,
                finalPrice: p.finalPrice,
                price: p.price,
                discountPercent: p.discountPercent,
              }
            : null,
          productId: p?._id || it.productId,
        };
      }),
    }));

    return res.json({
      page: Number(page),
      limit: Number(limit),
      total,
      hasMore: skip + enriched.length < total,
      orders: enriched,
    });
  } catch (err) {
    console.error("getMySellerOrders error", err);
    return res.status(500).json({ message: "Failed to fetch seller orders" });
  }
};



export const getMySellerOrderDetails = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const seller = await Seller.findOne({ userId, isDeleted: false }).lean();
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    const sellerId = seller.userId;

    const order = await Order.findOne({
      _id: req.params.id,
      sellerId,
    })
      .populate({
        path: "userId",
        select: "name username profilePic regNumber phone",
      })
      .populate({
        path: "items.productId",
        select: "title thumbnail price finalPrice discountPercent",
      })
      .lean();

    if (!order) return res.status(404).json({ message: "Order not found" });

    return res.json(order);
  } catch (err) {
    console.error("getMySellerOrderDetails error", err);
    return res.status(500).json({ message: "Failed to fetch order" });
  }
};

// seller update order status

// export const updateMySellerOrderStatus = async (req, res) => {
//   try {
//     const userId = req.user?._id;
//     const userRole = req.user?.role;

//     if (!userId) return res.status(401).json({ message: "Unauthorized" });

//     let targetSellerUserId = null;
//     let isModeratorMode = false;

//     // ====================================================================
//     // 🔐 ১. সেলার বনাম মডারেটর অনুযায়ী শপের ওনারের ইউজার আইডি নির্ধারণ
//     // ====================================================================
//     if (userRole === "SELLER") {
//       const seller = await Seller.findOne({ userId, isDeleted: false }).lean();
//       if (!seller) return res.status(404).json({ message: "Seller not found" });
//       targetSellerUserId = seller.userId;
//     } else if (userRole === "MODERATOR") {
//       if (req.user.moderatorStatus === "inactive" || !req.user.sellerId) {
//         return res
//           .status(403)
//           .json({
//             message: "Access denied. Inactive or unlinked moderator account.",
//           });
//       }

//       // মডারেটরের 'sellerId' (যা সেলারের userId) ব্যবহার করে শপ প্রোফাইল খোঁজা
//       const linkedShop = await Seller.findOne({
//         userId: req.user.sellerId,
//         isDeleted: false,
//       }).lean();
//       if (!linkedShop) {
//         return res
//           .status(404)
//           .json({
//             message: "Linked shop profile not found for this moderator.",
//           });
//       }

//       targetSellerUserId = linkedShop.userId;
//       isModeratorMode = true;
//     } else {
//       return res.status(403).json({ message: "Access denied." });
//     }

//     const orderId = req.params.id;
//     const nextStatus = String(req.body?.status || "").trim();

//     console.log(
//       `📡 [Status Update]: Action by ${userRole} | Shop Owner ID: ${targetSellerUserId} | Next Status: ${nextStatus}`,
//     );

//     // allowed statuses
//     const ALLOWED = [
//       "placed",
//       "processing",
//       "shipped",
//       "delivered",
//       "cancelled",
//     ];
//     if (!ALLOWED.includes(nextStatus)) {
//       return res.status(400).json({ message: "Invalid status" });
//     }

//     // ====================================================================
//     // 🔍 ২. ডাইনামিক ফিল্টার দিয়ে ডাটাবেজ থেকে অর্ডার খুঁজে বের করা
//     // ====================================================================
//     const orderFilter = { _id: orderId, sellerId: targetSellerUserId };

//     // 🎯 মেইন সিকিউরিটি ফিক্স: মডারেটর হলে সে শুধুমাত্র তার নিজের অ্যাসাইন করা অর্ডারের স্ট্যাটাস চেঞ্জ করতে পারবে
//     if (isModeratorMode) {
//       orderFilter.assignedModerator = userId;
//     }

//     const order = await Order.findOne(orderFilter);
//     if (!order)
//       return res
//         .status(404)
//         .json({
//           message: "Order not found or you are not assigned to this order",
//         });

//     if (order.status === "delivered") {
//       return res
//         .status(400)
//         .json({ message: "Delivered order cannot be changed" });
//     }

//     // status backwards check
//     const rank = {
//       placed: 1,
//       processing: 2,
//       shipped: 3,
//       delivered: 4,
//       cancelled: 99,
//     };

//     if (order.status !== "cancelled" && nextStatus !== "cancelled") {
//       const prevR = rank[order.status] || 0;
//       const nextR = rank[nextStatus] || 0;
//       if (nextR < prevR) {
//         return res
//           .status(400)
//           .json({ message: "Cannot move status backwards" });
//       }
//     }

//     // ৩. স্ট্যাটাস এবং ট্র্যাকিং টাইমস্ট্যাম্প আপডেট
//     order.status = nextStatus;
//     order.updatedAt = new Date();

//     if (nextStatus === "shipped")
//       order.shippedAt = order.shippedAt || new Date();
//     if (nextStatus === "delivered")
//       order.deliveredAt = order.deliveredAt || new Date();
//     if (nextStatus === "cancelled")
//       order.cancelledAt = order.cancelledAt || new Date();

//     await order.save();

//     return res.json({ success: true, orderId, status: nextStatus });
//   } catch (err) {
//     console.error("updateMySellerOrderStatus error", err);
//     return res.status(500).json({ message: "Failed to update status" });
//   }
// };


export const updateMySellerOrderStatus = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let targetSellerUserId = null;
    let isModeratorMode = false;

    // ====================================================================
    // 🔐 ১. সেলার বনাম মডারেটর অনুযায়ী শপের ওনারের ইউজার আইডি নির্ধারণ
    // ====================================================================
    if (userRole === "SELLER") {
      const seller = await Seller.findOne({ userId, isDeleted: false }).lean();
      if (!seller) return res.status(404).json({ message: "Seller not found" });
      targetSellerUserId = seller.userId;
    } else if (userRole === "MODERATOR") {
      if (req.user.moderatorStatus === "inactive" || !req.user.sellerId) {
        return res.status(403).json({
          message: "Access denied. Inactive or unlinked moderator account.",
        });
      }

      const linkedShop = await Seller.findOne({
        userId: req.user.sellerId,
        isDeleted: false,
      }).lean();
      if (!linkedShop) {
        return res.status(404).json({
          message: "Linked shop profile not found for this moderator.",
        });
      }

      targetSellerUserId = linkedShop.userId;
      isModeratorMode = true;
    } else {
      return res.status(403).json({ message: "Access denied." });
    }

    const orderId = req.params.id;
    const nextStatus = String(req.body?.status || "")
      .trim()
      .toLowerCase(); // 🎯 সেফটি লোয়ারকেস

    console.log(
      `📡 [Status Update]: Action by ${userRole} | Shop Owner ID: ${targetSellerUserId} | Next Status: ${nextStatus}`,
    );

    // allowed statuses (আপনার স্পেলিং অনুযায়ী 'cancelled' রাখা হলো)
    const ALLOWED = [
      "placed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!ALLOWED.includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // ====================================================================
    // 🔍 ২. ডাইনামিক ফিল্টার দিয়ে ডাটাবেজ থেকে অর্ডার খুঁজে বের করা
    // ====================================================================
    const orderFilter = { _id: orderId, sellerId: targetSellerUserId };

    if (isModeratorMode) {
      orderFilter.assignedModerator = userId;
    }

    const order = await Order.findOne(orderFilter);
    if (!order) {
      return res.status(404).json({
        message: "Order not found or you are not assigned to this order",
      });
    }

    // 🛑 মেইন রুল ১: একবার ডেলিভারড বা ক্যানসেলড হয়ে গেলে আর কোনো স্ট্যাটাস চেঞ্জ হবে না
    if (order.status === "delivered") {
      return res
        .status(400)
        .json({ message: "Delivered order cannot be changed" });
    }
    if (order.status === "cancelled") {
      return res
        .status(400)
        .json({ message: "Already cancelled order cannot be changed" });
    }

    // ====================================================================
    // 🛑 ৩. স্ট্যাটাস ব্যাকওয়ার্ড ও ক্যানসেলেশন রুলস
    // ====================================================================
    const rank = {
      placed: 1,
      processing: 2,
      shipped: 3,
      delivered: 4,
    };

    // 🎯 মেইন ফিক্স: পরবর্তী স্ট্যাটাস 'cancelled' হলে পিছনের চেকিং স্কিপ করবে (যেকোনো সময় ক্যানসেল করা যাবে)
    if (nextStatus !== "cancelled") {
      const prevR = rank[order.status] || 0;
      const nextR = rank[nextStatus] || 0;

      if (nextR < prevR) {
        return res
          .status(400)
          .json({ message: "Cannot move status backwards" });
      }
    }

    // ৪. স্ট্যাটাস এবং ট্র্যাকিং টাইমস্ট্যাম্প আপডেট
    order.status = nextStatus;
    order.updatedAt = new Date();

    if (nextStatus === "shipped")
      order.shippedAt = order.shippedAt || new Date();
    if (nextStatus === "delivered")
      order.deliveredAt = order.deliveredAt || new Date();

    // আপনার ওল্ড ডাটাবেজ ফিল্ড অনুযায়ী কন্ডিশন সিঙ্ক করা হলো
    if (nextStatus === "cancelled") {
      order.cancelledAt = order.cancelledAt || new Date();
    }

    await order.save();

    return res.json({ success: true, orderId, status: nextStatus });
  } catch (err) {
    console.error("updateMySellerOrderStatus error", err);
    return res.status(500).json({ message: "Failed to update status" });
  }
};
