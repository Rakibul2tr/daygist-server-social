
import mongoose from "mongoose";
import Cart from "../../models/ecommarce/Cart.model.js";
import EcomProduct from "../../models/ecommarce/EcomProduct.js";
import Order from "../../models/ecommarce/Order.model.js";
import User from "../../models/user/user.model.js";
import { trackEcommerceInterest } from "../../services/ecommerce/ecommerceInterest.service.js";
import Seller from "../../models/ecommarce/Seller.model.js"; // 👈 নিশ্চিত করুন সেলার মডেলটি ইম্পোর্ট করা আছে
import Counter from "../../models/ecommarce/Counter.model.js"; // 👈 নিশ্চিত করুন কাউন্টার মডেলটি ইম্পোর্ট করা আছে

// export const placeOrder = async (req, res) => {
//   const { addressText } = req.body;

//   const cart = await Cart.findOne({ userId: req.user._id });
//   if (!cart || cart.items.length === 0) {
//     return res.status(400).json({ message: "Cart is empty" });
//   }

//   let subtotal = 0;
//   const items = [];
//   const sellerMap = new Map();

//   for (const c of cart.items) {
//     const product = await EcomProduct.findById(c.productId);
//     if (!product) continue;

//     subtotal += product.finalPrice * c.qty;

//     items.push({
//       productId: product._id,
//       sellerId: product.sellerId,
//       title: product.title,
//       price: product.finalPrice,
//       qty: c.qty,
//     });

//     sellerMap.set(product.sellerId.toString(), {
//       sellerId: product.sellerId,
//       status: "placed",
//     });
//   }

//   const shippingFee = 60;
//   const total = subtotal + shippingFee;

//   const order = await Order.create({
//     userId: req.user._id,
//     items,
//     sellerStatuses: Array.from(sellerMap.values()),
//     subtotal,
//     shippingFee,
//     total,
//     addressText,
//   });

//   await EcomProduct.updateOne({ _id: productId }, { $inc: { soldCount: qty } });

//   await Cart.deleteOne({ userId: req.user._id });

//   res.json(order);
// };



export const placeOrder = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { items, address, paymentMethod } = req.body;

    if (!items?.length) {
      return res.status(400).json({ success: false, message: "No items" });
    }

    if (!address?.name || !address?.phone || !address?.address) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid address" });
    }

    // 🔥 Recalculate from DB (never trust frontend)
    let subtotal = 0;
    const validatedItems = [];
    let product = null;

    for (const it of items) {
      product = await EcomProduct.findById(it.productId).lean();
      if (!product || product.status !== "active") continue;

      const price =
        product.finalPrice ??
        (product.discountPercent
          ? Math.round(
              product.price - (product.price * product.discountPercent) / 100,
            )
          : product.price);

      subtotal += price * it.qty;

      validatedItems.push({
        productId: product._id,
        qty: it.qty,
        price,
        variant: it.variant || "Default",
      });
    }

    if (!product) {
      return res
        .status(400)
        .json({ success: false, message: "No active products found" });
    }

    const shippingFee = subtotal > 0 ? 60 : 0;
    const total = subtotal + shippingFee;

    // ====================================================================
    // 🔄 শপ লেভেল রাউন্ড-রবিন মডারেটর অ্যাসাইনমেন্ট (সংশোধিত ও ফিক্সড)
    // ====================================================================
    let assignedShopModeratorId = null;
    const targetSellerUserId = product.sellerId; // এটি সেলারের User ID (যেমন: req.user._id)

    if (targetSellerUserId) {
      const sellerObjectId = new mongoose.Types.ObjectId(
        String(targetSellerUserId),
      );
      // 🎯 মেইন ফিক্স: সেলারের User ID দিয়ে তার আসল Seller (Shop) প্রোফাইলের _id খুঁজে বের করা
      const shopProfile = await Seller.findOne({
        userId: sellerObjectId,
        isDeleted: false,
      }).lean();

      // যদি শপ প্রোফাইল পাওয়া যায়, তবেই কেবল তার মডারেটর খোঁজা হবে
      if (shopProfile) {
        const shopId = shopProfile._id; // 👈 এটিই হচ্ছে মডারেটরের গায়ে থাকা আসল 'sellerId' (6a1eafc65...)

        // ১. এই নির্দিষ্ট শপ প্রোফাইল আইডির আন্ডারে কতজন ACTIVE শপ মডারেটর আছে তাদের বের করুন
        const activeShopModerators = await User.find({
          role: "MODERATOR",
          moderatorStatus: "active",
          sellerId: sellerObjectId, // 🎯 এখন আইডি দুটি হুবহু ম্যাচ করবে
        }).sort({ _id: 1 });

        console.log(
          `🔍 [PlaceOrder Live]: শপের নাম: ${shopProfile.shopName} | একটিভ স্টাফ: ${activeShopModerators.length} জন`,
        );

        if (activeShopModerators.length > 0) {
          // ২. এই শপের শেষ অর্ডারটি খুঁজুন যাতে কোনো শপ মডারেটর অ্যাসাইন করা ছিল
          const lastAssignedOrder = await Order.findOne({
            sellerId: sellerObjectId, // অর্ডার মডেলে সেলারের User ID ই সেভ হচ্ছে
            assignedModerator: { $ne: null },
          }).sort({ createdAt: -1 });

          if (!lastAssignedOrder || !lastAssignedOrder.assignedModerator) {
            // ৩. প্রথম অর্ডার হলে প্রথম মডারেটর পাবে
            assignedShopModeratorId = activeShopModerators[0]._id;
          } else {
            // ৪. শেষ কোন স্টাফ অর্ডার পেয়েছিল তার পজিশন বা ইনডেক্স বের করুন
            const lastModeratorId =
              lastAssignedOrder.assignedModerator.toString();
            const lastIndex = activeShopModerators.findIndex(
              (mod) => mod._id.toString() === lastModeratorId,
            );

            // ৫. রাউন্ড রবিন ফর্মুলা
            if (lastIndex === -1) {
              assignedShopModeratorId = activeShopModerators[0]._id;
            } else {
              const nextIndex = (lastIndex + 1) % activeShopModerators.length;
              assignedShopModeratorId = activeShopModerators[nextIndex]._id;
            }
          }
        }
      }
    }
    console.log(
      "🎯 [PlaceOrder Live]: ফাইনাল অ্যাসাইন করা মডারেটর আইডি:",
      assignedShopModeratorId,
    );

    const counter = await Counter.findOneAndUpdate(
      { id: "order_id" },
      { $inc: { seq: 1 } }, // সিরিয়াল ১ বাড়াবে
      { new: true, upsert: true }, // না থাকলে নতুন তৈরি করবে
    );

    const customOrderId = `DGO-${counter.seq}`;
    // ====================================================================

    // এই সেলারের দোকানে অলরেডি মোট কতটি অর্ডার এসেছে তা ডাটাবেজ থেকে গোনা
    const totalPreviousShopOrders = await Order.countDocuments({
      sellerId: targetSellerUserId,
    });
    const currentShopOrderCount = totalPreviousShopOrders + 1;

    const order = await Order.create({
      userId,
      items: validatedItems,
      sellerId: targetSellerUserId,
      subtotal,
      shippingFee,
      total,
      address,
      paymentMethod,
      assignedModerator: assignedShopModeratorId, // 🎯 এখন পারফেক্টলি আইডি সেভ হবে
      customOrderId, // 🎯 কাস্টম অর্ডার আইডি সেভ হচ্ছে
      sellerOrderCount: currentShopOrderCount,
    });

    await Seller.findOneAndUpdate(
      { userId: targetSellerUserId }, // শপের মালিকের আইডি
      { $inc: { totalOrders: 1 } }, // দোকানের মোট অর্ডার কাউন্ট ১ বাড়িয়ে দেবে
    );

    if (userId) {
      trackEcommerceInterest({
        userId,
        product: product,
        action: "order",
      }).catch((err) => {
        console.error("Ecommerce interest tracking failed:", err);
      });
    }

    return res.json({
      success: true,
      data: order,
      message: "Order placed and routed to shop moderator successfully",
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};



export const getMyOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { userId: req.user._id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate({
          path: "items.productId",
          select: "title thumbnail", // ✅ name + image + price
        })
        .lean(),
      Order.countDocuments(filter),
    ]);

    // ✅ items.product snapshot তৈরি করে পাঠানো
    const enriched = orders.map((o) => ({
      ...o,
      items: (o.items || []).map((it) => {
        const p = it.productId; // populated doc
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

    res.json({
      page: Number(page),
      limit: Number(limit),
      total,
      hasMore: skip + enriched.length < total,
      orders: enriched,
    });
  } catch (err) {
    console.error("getMyOrders error", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (err) {
    console.error("getOrderDetails error", err);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

// export const getAllOrders = async (req, res) => {
//   console.log("orders click");
//   try {
//     let query = {};
//     console.log("req.user", req.user, query);

//     // যদি লগইন করা ইউজার মডারেটর হয়, তবে শুধু তার নিজের এসাইন করা অর্ডার খুঁজবে
//     if (req.user.role === "MODERATOR") {
//       query.assignedModerator = req.user._id;
//     }
//     // ইউজার যদি ADMIN বা SUPPER ADMIN হয়, তবে query ফাকাই থাকবে (অর্থাৎ সব অর্ডার আসবে)

//     const orders = await Order.find(query).populate(
//       "assignedModerator",
//       "name email",
//     );
//     // console.log('orders',orders);
    

//     res.json({ ok: true, data: orders });
//   } catch (error) {
//     res.status(500).json({ ok: false, message: error.message });
//   }
// };