// controllers/sellerFee.controller.js (ESM)
import mongoose from "mongoose";
import EcomProduct from "../../models/ecommarce/EcomProduct.js";
import Wallet from "../../models/wallet/wallet.model.js";
import BoostPricing from "../../models/ecommarce/BoostPrising.model.js";
import Order from "../../models/ecommarce/Order.model.js";
import EcomSellerPaymentTransaction from "../../models/ecommarce/EcomSellerPaymentTransaction.js";


const PRODUCT_UPLOAD_FEE = 20; // ✅ তোমার চাইলে DB config বানিয়ে নিতে পারো

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + Number(days || 0));
  return x;
}


export const payProductFee = async (req, res) => {
  const currentUser = req.user;

  if (!currentUser) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const productId = req.params.id;
  const { feeType, tier, uploadFeeCost } = req.body || {};

  console.log("fee type", feeType, uploadFeeCost, "by role:", currentUser.role);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid product id" });
  }

  if (!["upload", "boost", "order accept"].includes(String(feeType))) {
    return res.status(400).json({ success: false, message: "Invalid feeType" });
  }

  // ====================================================================
  // 🔐 ১. ডায়নামিক শপ মালিক (Seller User ID) নির্ধারণ লজিক
  // ====================================================================
  let actualSellerUserId = null;

  if (currentUser.role === "SELLER") {
    actualSellerUserId = currentUser._id;
  } else if (currentUser.role === "MODERATOR") {
    // মডারেটর ইনঅ্যাক্টিভ বা কোনো শপের আন্ডারে ট্যাগ না থাকলে ব্লক
    if (currentUser.moderatorStatus === "inactive" || !currentUser.sellerId) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Inactive or unlinked moderator account.",
        });
    }

    // মডারেটরের 'sellerId' (যা মূলত সেলারের userId) সরাসরি ব্যবহার করা হলো
    actualSellerUserId = new mongoose.Types.ObjectId(
      String(currentUser.sellerId),
    );
  } else {
    return res
      .status(403)
      .json({
        success: false,
        message: "Access denied: Sellers or Shop staff only.",
      });
  }

  // ====================================================================
  // 🔍 ২. প্রোডাক্ট ভেরিফিকেশন (প্রকৃত সেলার আইডি দিয়ে খোঁজা)
  // ====================================================================
  const product = await EcomProduct.findOne({
    _id: productId,
    sellerId: actualSellerUserId,
  });
  if (!product) {
    return res
      .status(404)
      .json({ success: false, message: "Product not found in this shop" });
  }

  let cost = 0;
  let productUpdate = {};

  // --- UPLOAD FEE ---
  if (feeType === "upload") {
    if (product.uploadFeePaid) {
      return res
        .status(400)
        .json({ success: false, message: "Upload fee already paid" });
    }
    cost = Number(uploadFeeCost || 0);
    if (!cost) {
      return res
        .status(400)
        .json({ success: false, message: "upload FeeCost required" });
    }
    const nextStatus = product.status === "draft" ? "pending" : product.status;
    productUpdate = {
      uploadFeePaid: true,
      uploadFeeCost: cost,
      uploadFeePaidAt: new Date(),
      status: nextStatus,
      statusUpdatedAt: new Date(),
    };
  }

  // --- BOOST FEE ---
  if (feeType === "boost") {
    if (!tier || !["basic", "regular", "pro"].includes(String(tier))) {
      return res
        .status(400)
        .json({ success: false, message: "tier required: basic|regular|pro" });
    }
    const pricing = await BoostPricing.findOne({ tier, isActive: true }).lean();
    if (!pricing) {
      return res
        .status(400)
        .json({ success: false, message: "Boost tier not found/disabled" });
    }
    cost = Number(pricing.price || 0);
    const days = Number(pricing.defaultDays || 0);
    const startAt = new Date();
    const endAt = addDays(startAt, days);

    productUpdate = {
      isBoosted: true,
      boostTier: tier,
      boostCost: cost,
      boostDays: days,
      boostStartAt: startAt,
      boostEndAt: endAt,
      boostPaidAt: new Date(),
    };
  }

  // --- ORDER ACCEPT FEE ---
  if (feeType === "order accept") {
    cost = Number(uploadFeeCost || 0);
    if (!cost) {
      return res
        .status(400)
        .json({ success: false, message: "Order accept fee cost required" });
    }
  }

  // ====================================================================
  // 💳 ৩. ট্রানজেকশন প্রসেসিং (মালিকের ওয়ালেট থেকে টাকা কাটা)
  // ====================================================================
  const session = await mongoose.startSession();

  try {
    let resultProduct;

    await session.withTransaction(async () => {
      // 🎯 ফিক্স: ব্যালেন্স কাটবে মডারেটরের মালিকের (actualSellerUserId) ওয়ালেট থেকে
      const wallet = await Wallet.findOneAndUpdate(
        {
          userId: actualSellerUserId,
          available: { $gte: cost },
        },
        {
          $inc: { available: -cost },
        },
        {
          new: true,
          session,
        },
      );

      if (!wallet) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // UPLOAD UPDATE
      if (feeType === "upload") {
        resultProduct = await EcomProduct.findOneAndUpdate(
          { _id: productId, sellerId: actualSellerUserId },
          { $set: productUpdate },
          { new: true, session },
        );
        if (!resultProduct) throw new Error("PRODUCT_UPDATE_FAILED");
      }

      // BOOST UPDATE
      if (feeType === "boost") {
        resultProduct = await EcomProduct.findOneAndUpdate(
          { _id: productId, sellerId: actualSellerUserId },
          { $set: productUpdate },
          { new: true, session },
        );
        if (!resultProduct) throw new Error("PRODUCT_UPDATE_FAILED");

        await EcomSellerPaymentTransaction.create(
          [
            {
              sellerId: actualSellerUserId,
              productId,
              paymentType: "boost",
              amount: cost,
              boostTier: tier,
              boostDays: productUpdate.boostDays || 0,
              status: "success",
              description: `Product ${tier} boost fee paid by ${currentUser.role}`,
            },
          ],
          { session },
        );
      }

      // ORDER ACCEPT UPDATE
      if (feeType === "order accept") {
        const order = await Order.findOneAndUpdate(
          {
            sellerId: actualSellerUserId,
            "items.productId": productId,
            status: { $in: ["placed"] },
          },
          {
            $set: { status: "processing" },
          },
          {
            new: true,
            session,
          },
        );

        if (!order) {
          throw new Error("ORDER_NOT_FOUND_OR_ALREADY_ACCEPTED");
        }

        // ট্রানজেকশন রেকর্ডে প্রকৃত মালিকের আইডি সেভ হবে
        await EcomSellerPaymentTransaction.create(
          [
            {
              sellerId: actualSellerUserId,
              productId,
              orderId: order._id,
              paymentType: "order_accept",
              amount: cost,
              status: "success",
              description: `Order accept fee paid by ${currentUser.role}`,
            },
          ],
          { session },
        );
      }
    });

    return res.json({
      success: true,
      message:
        feeType === "upload"
          ? "Upload fee paid"
          : feeType === "order accept"
            ? "Order fee paid"
            : "Boost applied",
      data: {
        productId: resultProduct?._id,
        feeType,
        cost,
        boost:
          feeType === "boost"
            ? {
                tier: resultProduct.boostTier,
                days: resultProduct.boostDays,
                startAt: resultProduct.boostStartAt,
                endAt: resultProduct.boostEndAt,
              }
            : null,
        uploadFeePaid: resultProduct?.uploadFeePaid,
        status: resultProduct?.status,
      },
    });
  } catch (e) {
    const msg =
      e?.message === "INSUFFICIENT_BALANCE"
        ? "Insufficient wallet balance"
        : e?.message || "Payment failed";

    return res.status(400).json({ success: false, message: msg });
  } finally {
    session.endSession();
  }
};


// export const payProductFee = async (req, res) => {
//   const sellerId = req.user?._id;
//   const productId = req.params.id;

//   const { feeType, tier, uploadFeeCost } = req.body || {};
//   console.log('fee type',feeType, uploadFeeCost);
  

//   if (!sellerId)
//     return res.status(401).json({ success: false, message: "Unauthorized" });
//   if (!mongoose.Types.ObjectId.isValid(productId))
//     return res
//       .status(400)
//       .json({ success: false, message: "Invalid product id" });

//   if (!["upload", "boost","order accept"].includes(String(feeType)))
//     return res
//       .status(400)
//       .json({ success: false, message: "feeType must be upload | boost" });

//   const product = await EcomProduct.findOne({ _id: productId, sellerId });
//   if (!product)
//     return res
//       .status(404)
//       .json({ success: false, message: "Product not found" });

//   // ✅ FIX 1: declare cost
//   let cost = 0;
//   let productUpdate = {};

//   if (feeType === "upload") {
//     if (product.uploadFeePaid) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Upload fee already paid" });
//     }

//     // ✅ cost for upload (body থেকে আসবে)
//     cost = Number(uploadFeeCost || 0);
//     if (!cost ) {
//       return res
//         .status(400)
//         .json({ success: false, message: "upload FeeCost required" });
//     }

//     const nextStatus = product.status === "draft" ? "pending" : product.status;

//     productUpdate = {
//       uploadFeePaid: true,
//       uploadFeeCost: cost,
//       uploadFeePaidAt: new Date(),
//       status: nextStatus,
//       statusUpdatedAt: new Date(),
//     };
//   }

//   if (feeType === "boost") {
//     if (!tier || !["basic", "regular", "pro"].includes(String(tier))) {
//       return res
//         .status(400)
//         .json({ success: false, message: "tier required: basic|regular|pro" });
//     }

//     const pricing = await BoostPricing.findOne({ tier, isActive: true }).lean();
//     if (!pricing) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Boost tier not found/disabled" });
//     }

//     // ✅ cost from DB pricing
//     cost = Number(pricing.price || 0);
//     const days = Number(pricing.defaultDays || 0);

//     const startAt = new Date();
//     const endAt = addDays(startAt, days);

//     productUpdate = {
//       isBoosted: true,
//       boostTier: tier,
//       boostCost: cost,
//       boostDays: days,
//       boostStartAt: startAt,
//       boostEndAt: endAt,
//       boostPaidAt: new Date(),
//     };
//   }

//   if (feeType === "order accept") {
   
//     // ✅ cost for upload (body থেকে আসবে)
//     cost = Number(uploadFeeCost || 0);
//     if (!cost) {
//       return res
//         .status(400)
//         .json({ success: false, message: "upload FeeCost required" });
//     }

//   }

//   const session = await mongoose.startSession();

//   try {
//     let resultProduct;

//     // await session.withTransaction(async () => {
//     //   // ✅ FIX 2: available balance check + deduct using cost
//     //   const wallet = await Wallet.findOneAndUpdate(
//     //     { userId: sellerId, available: { $gte: cost } }, // ✅ তোমার wallet field: available
//     //     { $inc: { available: -cost } },
//     //     { new: true, session },
//     //   );

//     //   if (!wallet) throw new Error("INSUFFICIENT_BALANCE");

//     //   resultProduct = await EcomProduct.findOneAndUpdate(
//     //     { _id: productId, sellerId },
//     //     { $set: productUpdate },
//     //     { new: true, session },
//     //   );

//     //   const order = await Order.findOneAndUpdate(
//     //     {
//     //       sellerId,
//     //       "items.productId": productId,
//     //       status: {
//     //         $in: ["placed", "processing"],
//     //       },
//     //     },
//     //     {
//     //       $set: {
//     //         status: "accepted",
//     //       },
//     //     },
//     //     {
//     //       new: true,
//     //       session,
//     //     },
//     //   );

//     //   if (!order) {
//     //     throw new Error("ORDER_NOT_FOUND_OR_ALREADY_ACCEPTED");
//     //   }
//     // });


//     await session.withTransaction(async () => {
//       // ==========================================
//       // 1. WALLET থেকে FEE কাটবে
//       // ==========================================

//       const wallet = await Wallet.findOneAndUpdate(
//         {
//           userId: sellerId,
//           available: { $gte: cost },
//         },
//         {
//           $inc: {
//             available: - cost,
//           },
//         },
//         {
//           new: true,
//           session,
//         },
//       );

     
    
      

//       if (!wallet) {
//         throw new Error("INSUFFICIENT_BALANCE");
//       }

//       // ==========================================
//       // 2. UPLOAD
//       // ==========================================

//       if (feeType === "upload") {
//         resultProduct = await EcomProduct.findOneAndUpdate(
//           {
//             _id: productId,
//             sellerId,
//           },
//           {
//             $set: productUpdate,
//           },
//           {
//             new: true,
//             session,
//           },
//         );

//         if (!resultProduct) {
//           throw new Error("PRODUCT_UPDATE_FAILED");
//         }
//       }

//       // ==========================================
//       // 3. BOOST
//       // ==========================================

//       if (feeType === "boost") {
//         resultProduct = await EcomProduct.findOneAndUpdate(
//           {
//             _id: productId,
//             sellerId,
//           },
//           {
//             $set: productUpdate,
//           },
//           {
//             new: true,
//             session,
//           },
//         );

//         if (!resultProduct) {
//           throw new Error("PRODUCT_UPDATE_FAILED");
//         }

//         // ✅ BOOST PAYMENT RECORD
//         await EcomSellerPaymentTransaction.create(
//           [
//             {
//               sellerId,
//               productId,

//               paymentType: "boost",

//               amount: cost,

//               boostTier: tier,

//               boostDays: productUpdate.boostDays || 0,

//               status: "success",

//               description: `Product ${tier} boost fee`,
//             },
//           ],
//           { session },
//         );
//       }

//       // ==========================================
//       // 4. ORDER ACCEPT
//       // ==========================================

//       if (feeType === "order accept") {
//         const order = await Order.findOneAndUpdate(
//           {
//             sellerId,

//             "items.productId": productId,

//             status: {
//               $in: ["placed"],
//             },
//           },
//           {
//             $set: {
//               status: "processing",
//             },
//           },
//           {
//             new: true,
//             session,
//           },
//         );

//         if (!order) {
//           throw new Error("ORDER_NOT_FOUND_OR_ALREADY_ACCEPTED");
//         }

//         // ✅ ORDER ACCEPT PAYMENT RECORD
//         await EcomSellerPaymentTransaction.create(
//           [
//             {
//               sellerId,

//               productId,

//               orderId: order._id,

//               paymentType: "order_accept",

//               amount: cost,

//               status: "success",

//               description: "Order accept fee",
//             },
//           ],
//           { session },
//         );
//       }
//     });
//     return res.json({
//       success: true,
//       message:
//         feeType === "upload"
//           ? "Upload fee paid"
//           : feeType === "upload"
//             ? "Order fee paid"
//             : "Boost applied",
//       data: {
//         productId: resultProduct?._id,
//         feeType,
//         cost,
//         boost:
//           feeType === "boost"
//             ? {
//                 tier: resultProduct.boostTier,
//                 days: resultProduct.boostDays,
//                 startAt: resultProduct.boostStartAt,
//                 endAt: resultProduct.boostEndAt,
//               }
//             : null,
//         uploadFeePaid: resultProduct?.uploadFeePaid,
//         status: resultProduct?.status,
//       },
//     });
//   } catch (e) {
//     const msg =
//       e?.message === "INSUFFICIENT_BALANCE"
//         ? "Insufficient wallet balance"
//         : e?.message || "Payment failed";

//     return res.status(400).json({ success: false, message: msg });
//   } finally {
//     session.endSession();
//   }
// };

