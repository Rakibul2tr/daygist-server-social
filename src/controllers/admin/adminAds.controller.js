import mongoose from "mongoose";
import Ad from "../../models/ads/ad.model.js"; // আপনার সঠিক পাথ
import User from "../../models/user/user.model.js"; // ইউজার ওয়ালেট ব্যালেন্সের জন্য
import Transaction from "../../models/transaction/transaction.model.js"; // ট্রানজেকশন ট্র্যাকিংয়ের জন্য
import Wallet from "../../models/wallet/wallet.model.js"; // ভিডিও ক্রিয়েটরের ওয়ালেট রিওয়ার্ডের জন্য
import Post from "../../models/post/post.model.js"; // ভিডিও ক্রিয়েটর আইডি (author) বের করার জন্য
import { deleteManyFromWasabi } from "../../services/wbUpload.service.js";

// 🟢 ১. বিজ্ঞাপন তৈরি করা (Create Ad - ডলার থেকে কয়েনে ১ বার টাকা কাটবে)
export const createAd = async (req, res) => {
  try {
    const {
      title,
      description,
      adType,
      media,
      thumbnail,
      ctaLink,
      ctaText,
      total_budget_usd, // 🌟 ফ্রন্টএন্ড থেকে আসা মেইন ডলার বাজেট
      duration,
      isSkippable,
      skipAfter,
      startDate,
      endDate,
    } = req.body;

    const advertiserId = req.user?._id; // কারেন্ট লগইন থাকা প্রোভাইডার

    // ক) প্রাথমিক ভ্যালিডেশন
    if (!advertiserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!title || !adType || !media || !media.url || !media.key || !total_budget_usd) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    if (Number(total_budget_usd) < 2) {
      return res.status(400).json({ success: false, message: "Minimum 2 USD budget required" });
    }

    // খ) বিজ্ঞাপনদাতার অ্যাকাউন্ট চেক ও ব্যালেন্স ডিডাকশন
    const advertiser = await User.findById(advertiserId);
    if (!advertiser || advertiser.balance < Number(total_budget_usd)) {
      return res.status(400).json({ success: false, message: "Insufficient USD balance in wallet" });
    }

    // মেইন ওয়ালেট থেকে একবারে ডলার কেটে নেওয়া
    await User.findByIdAndUpdate(advertiserId, {
      $inc: { balance: -Number(total_budget_usd) }
    });

    // গ) ট্রানজেকশন লগ তৈরি (type: 'own')
    await Transaction.create({
      userId: advertiserId,
      type: "own",
      amount: Number(total_budget_usd),
      reference: `Created Ad Campaign: ${title?.slice(0, 25)}`,
      status: "completed"
    });

    // 🌟 ঘ) ডলার বাজেটকে কয়েনে রূপান্তর করা (1 USD = 100,000 Coins)
    const coinBudget = Number(total_budget_usd) * 100000;

    const newAd = await Ad.create({
      advertiserId, // আপনার স্কিমার রিলেশন ফিল্ড
      title,
      description,
      adType,
      media,
      thumbnail,
      placement,
      ctaLink,
      ctaText,
      total_budget: coinBudget,      // কয়েন হিসেবে সেভ
      remaining_budget: coinBudget,  // কয়েন হিসেবে সেভ
      cost_per_view: 1,              // প্রতি অ্যাকশনে ১ কয়েন ফিক্সড
      duration,
      isSkippable,
      skipAfter,
      startDate,
      endDate,
      status: "active"
    });

    return res.status(201).json({ 
      success: true, 
      message: `Ad created successfully! ${coinBudget} coins added.`, 
      data: newAd 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to create ad" });
  }
};

// 🔵 ২. সব বিজ্ঞাপন লিস্ট দেখা (Get All Ads - Admin Panel এর জন্য)
export const getAllAds = async (req, res) => {
  try {
    const ads = await Ad.find().populate("advertiserId", "name email").sort({ createdAt: -1 });
    return res.json({ success: true, data: ads });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 🔵 ৩. অ্যাপের ফ্রন্টএন্ড ফিডের জন্য অ্যাক্টিভ বিজ্ঞাপন আনা (Get Active Ads for App)
export const getActiveAds = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: "User not found" });

    // 🌟 শুধু অ্যাক্টিভ এবং বিজ্ঞপ্তির কন্টেনারে কয়েন বাজেট অবশিষ্ট থাকা অ্যাডগুলোই ফিডে যাবে
    const query = { 
      status: "active",
      remaining_budget: { $gt: 0 }
    };

    // সব বিজ্ঞপ্তির মধ্য থেকে র‍্যান্ডমলি সিলেক্ট করার জন্য ফ্রন্টএন্ড হুক বাফারিং করবে, এখান থেকে লিস্ট যাবে
    const ads = await Ad.find(query).sort({ createdAt: -1 });
    
    return res.json({ success: true, data: ads });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 🟡 ৪. বিজ্ঞাপন আপডেট করা (Update Ad)
export const updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Ad ID" });
    }

    const updatedAd = await Ad.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!updatedAd) return res.status(404).json({ success: false, message: "Ad not found" });

    return res.json({ success: true, message: "Ad updated successfully", data: updatedAd });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 🔴 ৫. বিজ্ঞাপন ডিলিট করা (Delete Ad - Wasabi রিমুভাল এবং ৫০% পেনাল্টি রিফান্ডসহ)
export const deleteAd = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Ad ID" });
    }

    const ad = await Ad.findById(id);
    if (!ad) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }

    // ওনারশিপ চেক (অ্যাডমিন ছাড়া অন্য ইউজার নিজের অ্যাড ছাড়া ডিলিট করতে পারবে না)
    if (String(ad.advertiserId) !== String(userId) && userRole !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this campaign" });
    }

    // 🌟 ৫০% রিফান্ড পলিসি (যদি বাকি বাজেট থাকে এবং ইউজার নিজে ওনার হয়ে রিমুভ করে)
    if (ad.remaining_budget > 0 && userRole !== "admin") {
      const refundableCoins = ad.remaining_budget * 0.5; // ৫০% ফেরতযোগ্য কয়েন
      const refundUsdAmount = refundableCoins / 100000;  // ডলারে কনভার্ট (1 USD = 100,000 Coins)

      // প্রোভাইডারের ওয়ালেটে ব্যালেন্স প্লাস করা
      await User.findByIdAndUpdate(ad.advertiserId, {
        $inc: { balance: refundUsdAmount }
      });

      // রিফান্ড ট্রানজেকশন হিস্ট্রি রেকর্ড তৈরি করা
      await Transaction.create({
        userId: ad.advertiserId,
        type: "own",
        amount: refundUsdAmount,
        reference: `50% Refunded (Deleted Campaign): ${ad.title?.slice(0, 20)}`,
        status: "completed"
      });
    }

    // ওয়াসাবি ক্লাউড স্টোরেজ থেকে মিডিয়া রিমুভ করা (আপনার মেথড ঠিক রাখা হয়েছে)
    if (ad.media && ad.media.key) {
      try {
        const keys = [ad.media.key];
        console.log("Attempting to delete media from Wasabi:", keys);
        const out = await deleteManyFromWasabi(keys);
        console.log("Wasabi delete response:", out);
      } catch (wasabiError) {
        console.error("Failed to delete media from Wasabi storage:", wasabiError.message);
      }
    }

    await Ad.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Ad and its media permanently deleted, remaining budget 50% processed.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 📊 𝖹. বিজ্ঞাপনের ইমপ্রেশন ও ক্লিক ট্র্যাক করা (Track Analytics - ১ কয়েন ডিডাকশন ও রিওয়ার্ড কাটিং লজিক)
// রিয়্যাক্ট নেটিভ থেকে কুয়েরি প্যারামিটার হিসেবে পাঠানো হবে: ?action=skip, ?action=click, অথবা ?action=impression
export const trackAd = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, postId } = req.query; // postId হলো মেইন ভিডিও বা পোস্ট আইডি যার ওপরে অ্যাড চলছে
    const clickedBy = req.user?._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Ad ID" });
    }

    const ad = await Ad.findById(id);
    if (!ad) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }

    // কেস ১: ভিডিও শেষ হয়েছে (?action=impression) -> বাজেট থেকে টাকা কাটবে না, শুধু ডাটাবেসে ইম্প্রেশন বাড়বে
    if (action === "impression") {
      await Ad.findByIdAndUpdate(id, { $inc: { impressions: 1 } });
      return res.json({
        success: true,
        message: "Ad impression tracked (No balance deducted)",
      });
    }

    // কেস ২: ৫ সেকেন্ড পর স্কিপ করেছে অথবা বিজ্ঞাপনে ক্লিক করেছে (?action=skip || ?action=click)
    if (action === "skip" || action === "click") {
      // ক) চেক করা বিজ্ঞপ্তির নিজের কন্টেনারে পর্যাপ্ত কয়েন আছে কিনা
      if (ad.remaining_budget < 1 || ad.status !== "active") {
        ad.status = "out_of_budget";
        await ad.save();
        return res
          .status(400)
          .json({ success: false, message: "Ad is out of budget coins" });
      }

      // খ) বিজ্ঞপ্তির বাজেট থেকে সরাসরি ১ কয়েন মাইনাস করা এবং কাউন্ট বাড়ানো
      let updateData = { $inc: { remaining_budget: -1 } };
      if (action === "click") updateData.$inc.clicks = 1;
      else updateData.$inc.impressions = 1;

      const updatedAd = await Ad.findByIdAndUpdate(id, updateData, {
        new: true,
      });

      // বাজেট শেষ হয়ে গেলে স্ট্যাটাস অফ করা
      if (updatedAd.remaining_budget < 1) {
        await Ad.findByIdAndUpdate(id, { $set: { status: "out_of_budget" } });
      }

      // গ) ভিডিও ক্রিয়েটর ওয়ালেটে রিওয়ার্ড যোগ করা (যদি মেইন ভিডিও পোস্ট আইডি এভেলেবল থাকে)
      if (postId && mongoose.isValidObjectId(postId)) {
        const post = await Post.findById(postId).select("author");
        if (post && clickedBy && String(post.author) !== String(clickedBy)) {
          const videoAuthor = post.author;
          const coinPerClick = 1;

          const wallet = await Wallet.findOneAndUpdate(
            { userId: videoAuthor },
            { $inc: { coinEarned: coinPerClick } },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );

          // 🌟 আপনার কয়েন ওয়ালেট ক্যালকুলেশন লজিক: 1000 coin = 1 cent
          if (wallet.coinEarned >= 1000) {
            const newCent = Math.floor(wallet.coinEarned / 1000);
            wallet.sentEarned += newCent;
            wallet.coinEarned = wallet.coinEarned % 1000;
          }

          // 🌟 আপনার কয়েন ওয়ালেট ক্যালকুলেশন লজিক: 100 cent = 1 USD
          if (wallet.sentEarned >= 100) {
            const newUsd = Math.floor(wallet.sentEarned / 100);
            wallet.usdEarned += newUsd;
            wallet.sentEarned = wallet.sentEarned % 100;
          }

          await wallet.save();
        }
      }

      return res.json({
        success: true,
        message: `Ad ${action} tracked successfully. 1 coin deducted.`,
        remaining_budget: updatedAd.remaining_budget,
      });
    }

    return res
      .status(400)
      .json({ success: false, message: "Invalid action type" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};