import mongoose from "mongoose";
import Ad from "../../models/ads/ad.model.js";
import User from "../../models/user/user.model.js";
import Wallet from "../../models/wallet/wallet.model.js";
import Post from "../../models/post/post.model.js";
import Transaction from "../../models/transaction/transaction.model.js";
import { deleteManyFromWasabi } from "../../services/wbUpload.service.js";
import VideoClick from "../../models/post/videoClick.model.js";

export const createAdCampaign = async (req, res) => {
  try {
    const {
      title,
      description,
      adType,
      placement, // 🌟 ফ্রন্টএন্ড ট্যাব অনুযায়ী ডাইনামিক প্লেসনেন্ট ("home_feed", "video_player", "popup")
      ctaLink,
      ctaText,
      total_budget_usd,
      duration,
      isSkippable,
      skipAfter,
      startDate,
      age,
      gender,
      endDate,
      country,
      adCategory,
    } = req.body;

    const advertiserId = req.user?._id || req.user?.id;

    if (!advertiserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const advertiser = await User.findById(advertiserId);
    if (!advertiser) {
      return res
        .status(404)
        .json({ success: false, message: "Advertiser not found" });
    }

    // ১. চেক করা যে বিজ্ঞাপনদাতার ওয়ালেটে পর্যাপ্ত ব্যালেন্স আছে কিনা
    // (আপনার ইউজার মডেলে ব্যালেন্স ফিল্ডের নাম 'balance' বা 'usd_balance' যা আছে তা সিঙ্ক রাখবেন)
    const currentBalance = Number(
      advertiser.balance || advertiser.usd_balance || 0,
    );
    if (currentBalance < Number(total_budget_usd)) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient USD balance" });
    }

    // ২. বিজ্ঞাপনদাতার ওয়ালেট থেকে মেইন ডলার কেটে নেওয়া
    const balanceField =
      advertiser.usd_balance !== undefined ? "usd_balance" : "balance";
    await User.findByIdAndUpdate(advertiserId, {
      $inc: { [balanceField]: -Number(total_budget_usd) },
    });

    // ৩. নতুন ট্রানজেকশন হিস্ট্রি রেকর্ড তৈরি করা (own মোডে ইনস্ট্যান্ট কমপ্লিট)
    await Transaction.create({
      userId: advertiserId,
      type: "own",
      amount: Number(total_budget_usd),
      reference: `Created Ad Campaign: ${title?.slice(0, 30)}`,
      status: "completed",
    });

    // ৪. ডলারকে কয়েনে কনভার্ট করার মূল হিসাব (1 USD = 100,000 Coins)
    const totalBudgetInCoins = Number(total_budget_usd) * 100000;

    // 🌟 🌟 ৫. নতুন কাস্টমাইজড মডেল অনুযায়ী অবজেক্ট ডাটা সেভ 🌟 🌟
    const newAd = new Ad({
      advertiserId,
      title,
      description,
      adType,
      adCategory: adCategory,
      placement: placement || "home_feed", // আপনার কাস্টম ডাবল ট্যাব প্লেসমেন্ট লজিক

      // ওয়াসাবি ক্লাউড মিডিয়া অবজেক্ট
      media: {
        url: req.body.mediaUrl || (req.body.media && req.body.media.url),
        key: req.body.mediaKey || (req.body.media && req.body.media.key),
        provider: "wasabi",
      },

      // ভিডিও অ্যাডের কাভার থাম্বনেইল অবজেক্ট (যদি ফ্রন্টএন্ড থেকে আসে)
      thumbnail: {
        url:
          req.body.thumbnail ||
          (req.body.thumbnail && req.body.thumbnail.url) ||
          null,
        key:
          req.body.thumbnail ||
          (req.body.thumbnail && req.body.thumbnail.key) ||
          null,
        provider: "wasabi",
      },

      ctaLink,
      ctaText: ctaText || "Learn More",
      status: "active", // নতুন অ্যাড তৈরি হওয়া মাত্রই বাই-ডিফল্ট 'active' হবে

      total_budget: totalBudgetInCoins,
      remaining_budget: totalBudgetInCoins,
      cost_per_view: 1, // প্রতি ভিউ, স্কিপ বা ক্লিকে সরাসরি ১ কয়েন ডিডাক্ট হবে

      duration: Number(duration) || 0,
      isSkippable: isSkippable !== undefined ? isSkippable : true,
      skipAfter: Number(skipAfter) || 5,
      age: age || "everyone",
      gender: Array.isArray(gender) ? gender : ['male'],
      country: Array.isArray(country) ? country : ['Bangladesh'],
      // নতুন মডেলের কাউন্টার ও ট্র্যাকিং জিরো দিয়ে ইনিশিয়ালাইজ করা হলো
      impressions: 0,
      clicks: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      updateReason: "", // নতুন অ্যাডের জন্য কোনো রিজন থাকবে না

      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    });

    await newAd.save();
    console.log("New Ad Campaign Created:", newAd);

    return res.status(201).json({
      success: true,
      message: `Campaign created successfully! ${totalBudgetInCoins} coins added to ad budget.`,
      data: newAd,
    });
  } catch (error) {
    console.error("Create Ad Campaign Error:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to create campaign",
      });
  }
};

/**
 * ৪. বিজ্ঞাপনদাতার নিজস্ব ক্যাম্পেইনগুলোর তালিকা ও অ্যানালিটিক্স দেখা
 * GET /api/ads/my-campaigns
 */
export const getAdvertiserCampaigns = async (req, res) => {
  try {
    const advertiserId = req.user._id; // মিডলওয়্যার থেকে পাওয়া প্রোভাইডারের আইডি

    // ডাটাবেস থেকে ওই প্রোভাইডারের সব বিজ্ঞাপন নতুন থেকে পুরনো ক্রমে (createdAt: -1) খুঁজুন
    const campaigns = await Ad.find({ advertiserId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: campaigns.length,
      data: campaigns,
    });
  } catch (error) {
    console.error("Get Advertiser Campaigns Error:", error);
    return res.status(500).json({ success: false, message: "সার্ভার সমস্যা" });
  }
};

/**
 * ৫. পুরনো বিজ্ঞাপনে নতুন করে পে করে বাজেট বাড়ানো (Renew / Top-up Campaign)
 * POST /api/ads/renew/:adId
 */
export const renewAdCampaign = async (req, res) => {
  try {
    const { adId } = req.params;
    const { renew_budget_usd } = req.body; // প্রোভাইডার নতুন করে কত ডলার দিতে চায়
    const advertiserId = req.user._id;

    if (
      !renew_budget_usd ||
      isNaN(Number(renew_budget_usd)) ||
      Number(renew_budget_usd) <= 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "দয়া করে সঠিক ডলার অ্যামাউন্ট দিন" });
    }

    // ক) বিজ্ঞাপনদাতার মেইন অ্যাকাউন্ট ব্যালেন্স চেক করা
    const advertiser = await User.findById(advertiserId);
    if (!advertiser) {
      return res
        .status(404)
        .json({ success: false, message: "Advertiser not found" });
    }

    // খ) চেক করা যে মেইন ওয়ালেটে পর্যাপ্ত ডলার (USD) আছে কিনা
    if (advertiser.balance < Number(renew_budget_usd)) {
      return res.status(400).json({
        success: false,
        message: `আপনার ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই। প্রয়োজনীয়: $${renew_budget_usd}`,
      });
    }

    // গ) বিজ্ঞাপনটি খুঁজে বের করা
    const ad = await Ad.findOne({ _id: adId, advertiserId });
    if (!ad) {
      return res
        .status(404)
        .json({ success: false, message: "বিজ্ঞাপনটি পাওয়া যায়নি" });
    }

    // ঘ) মেইন ওয়ালেট থেকে নতুন ডলার কেটে নেওয়া
    await User.findByIdAndUpdate(advertiserId, {
      $inc: { balance: -Number(renew_budget_usd) },
    });

    // 🌟 ঙ) নতুন ট্রানজেকশন হিস্ট্রি রেকর্ড তৈরি করা
    await Transaction.create({
      userId: advertiserId,
      type: "own",
      amount: Number(renew_budget_usd),
      reference: `Renewed Ad Budget for Campaign: ${ad.title?.slice(0, 30)}`,
      status: "completed",
    });

    // 🌟 ঙ) নতুন ডলারকে কয়েনে কনভার্ট করার হিসাব (1 USD = 100,000 Coins)
    const newCoins = Number(renew_budget_usd) * 100000;

    // চ) বিজ্ঞপ্তির total_budget এবং remaining_budget-এ কয়েন যোগ করা এবং স্ট্যাটাস active করা
    ad.total_budget += newCoins;
    ad.remaining_budget += newCoins;
    ad.status = "active"; // বাজেট শেষ হয়ে out_of_budget থাকলে তা আবার active হবে

    await ad.save();

    return res.status(200).json({
      success: true,
      message: `ক্যাম্পেইন সফলভাবে রিনিউ হয়েছে! আরও ${newCoins} কয়েন যুক্ত করা হয়েছে।`,
      data: ad,
    });
  } catch (error) {
    console.error("Renew Campaign Error:", error);
    return res.status(500).json({ success: false, message: "সার্ভার সমস্যা" });
  }
};

/**
 * ১. ইউজারদের জন্য বিজ্ঞাপন তুলে আনা (Get Ads for Users)
 * রিয়্যাক্ট নেটিভ থেকে কুয়েরি প্যারামিটার হিসেবে placement পাঠানো হবে (উদা: /api/ads/fetch?placement=video_player)
 */
export const getAdsForUsers = async (req, res) => {
  try {
    const userId = req.user?._id;

    const user = await User.findById(userId)
      .select("country gender age")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const isAdult = user.age >= 18;

    // ডাটাবেস থেকে শুধু অ্যাক্টিভ এবং কয়েন বাজেট থাকা বিজ্ঞাপন খুঁজুন
    const query = {
      status: "active",
      remaining_budget: { $gt: 0 },

      $and: [
        {
          $or: [{ country: { $size: 0 } }, { country: user.country }],
        },

        {
          $or: [{ gender: { $size: 0 } }, { gender: user.gender }],
        },

        {
          $or: [
            { age: "everyone" },
            {
              age: isAdult ? "adult" : "under_adult",
            },
          ],
        },
      ],
    };

    const activeAds = await Ad.find(query)
      .populate("advertiserId", "name avatar")
      .lean();

    if (!activeAds || activeAds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "কোনো বিজ্ঞাপন নেই",
        data: null,
      });
    }

    // যেকোনো ১টি বিজ্ঞাপন র‍্যান্ডমলি সিলেক্ট করে ফ্রন্টএন্ডে পাঠানো (ইউটিউব/ফেসবুক স্টাইল)
    const randomAd = activeAds[Math.floor(Math.random() * activeAds.length)];

    return res.status(200).json({
      success: true,
      data: randomAd,
    });
  } catch (error) {
    console.error("Get Ads Error:", error);
    return res.status(500).json({ success: false, message: "সার্ভার সমস্যা" });
  }
};

export const handleAdAction = async (req, res) => {
  try {
    const clickedBy = req.user?._id;
    const { postId } = req.params;
    const { action, adId } = req.body; // action: "click", "skip", "end"

    if (!clickedBy) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!mongoose.isValidObjectId(postId) || !mongoose.isValidObjectId(adId)) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    const post = await Post.findById(postId).select("author");
    const ad = await Ad.findById(adId);

    if (!post || !ad) {
      return res.status(404).json({ message: "Post or Ad not found" });
    }

    const videoAuthor = post.author;

    // নিজের ভিডিওর অ্যাডে নিজে অ্যাকশন নিলে ইগনোর হবে
    if (String(videoAuthor) === String(clickedBy)) {
      return res.json({
        success: true,
        counted: false,
        message: "Own action ignored",
      });
    }

  // কেস ১: ভিডিও শেষ হয়েছে (action === "end") -> টাকা বা কয়েন কাটবে না, শুধু ইম্প্রেশন বাড়বে
  
    if (action === "end") {
      ad.impressions += 1;
      await ad.save();
      return res.json({
        success: true,
        counted: true,
        message: "End view recorded.",
      });
    }

    // কেস ২: ৫ সেকেন্ড পর স্কিপ বা বিজ্ঞাপনে ক্লিক (action === "skip" || action === "click")
    if (action === "skip" || action === "click") {
      // ক) চেক করা যে বিজ্ঞপ্তির কন্টেনারে কয়েন ব্যালেন্স আছে কিনা
      if (ad.remaining_budget < 1 || ad.status !== "active") {
        ad.status = "out_of_budget";
        await ad.save();
        return res
          .status(400)
          .json({ success: false, message: "Ad is out of budget coins" });
      }

      // খ) বিজ্ঞপ্তির বাজেট থেকে সরাসরি ১ কয়েন মাইনাস করা
      ad.remaining_budget -= 1;

      if (action === "click") {
        ad.clicks += 1;
        ad.impressions += 1;
        await Post.findByIdAndUpdate(postId, { $inc: { videoClickCount: 1 } });
      } else {
        ad.impressions += 1;
      }

      // বাজেট শেষ হয়ে গেলে স্ট্যাটাস অফ করা
      if (ad.remaining_budget < 1) {
        ad.status = "out_of_budget";
      }
      await ad.save();

      // 🌟 🌟 গ) স্পেশাল কন্ডিশন: ইউজার যদি "skip" বাটনে চাপ দেয়, তবে মূল ভিডিওর জন্য একটি 'VideoClick' কাউন্ট তৈরি হবে
      if (action === "skip") {
        await VideoClick.create({
          postId,
          userId: clickedBy,
          authorId: videoAuthor,
          adId,
        });

        // 💡 টিপস: আপনার মেইন 'Post' বা ভিডিও টেবিলে যদি click/view কাউন্টার ফিল্ড থাকে,
        // তবে নিচের কোডটি দিয়ে সেই ভিডিওর মেইন ভিউ কাউন্টও ১ বাড়িয়ে দিতে পারেন:
         await Post.findByIdAndUpdate(postId, { $inc: { videoClickCount: 1 } });
      }

      // ঘ) ভিডিও ক্রিয়েটরের ওয়ালেটে সরাসরি সেই ১ কয়েন যোগ করা
      const coinPerClick = 1;

      const wallet = await Wallet.findOneAndUpdate(
        { userId: videoAuthor },
        { $inc: { coinEarned: coinPerClick } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      // আপনার হিসাব: 1000 coin = 1 cent
      if (wallet.coinEarned >= 1000) {
        const newCent = Math.floor(wallet.coinEarned / 1000);
        wallet.sentEarned += newCent;
        wallet.coinEarned = wallet.coinEarned % 1000;
      }

      // আপনার হিসাব: 100 cent = 1 USD
      if (wallet.sentEarned >= 100) {
        const newUsd = Math.floor(wallet.sentEarned / 100);
        wallet.usdEarned += newUsd;
        wallet.sentEarned = wallet.sentEarned % 100;
      }

      await wallet.save();

      return res.json({
        success: true,
        counted: true,
        actionType: action,
        coinTransferred: coinPerClick,
        adRemainingCoins: ad.remaining_budget,
      });
    }

    return res.status(400).json({ message: "Invalid action type" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// export const handleAdAction = async (req, res) => {
//   try {
//     const clickedBy = req.user?._id;
//     const { postId } = req.params;
//     const { action, adId } = req.body; // action: "click", "skip", "end"

//     if (!clickedBy) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     if (!mongoose.isValidObjectId(postId) || !mongoose.isValidObjectId(adId)) {
//       return res.status(400).json({ message: "Invalid IDs" });
//     }

//     const post = await Post.findById(postId).select("author");
//     const ad = await Ad.findById(adId);

//     if (!post || !ad) {
//       return res.status(404).json({ message: "Post or Ad not found" });
//     }

//     const videoAuthor = post.author;

//     // নিজের ভিডিওর অ্যাডে নিজে অ্যাকশন নিলে ইগনোর হবে
//     if (String(videoAuthor) === String(clickedBy)) {
//       return res.json({
//         success: true,
//         counted: false,
//         message: "Own action ignored",
//       });
//     }

//     // কেস ১: ভিডিও শেষ হয়েছে (action === "end") -> টাকা বা কয়েন কাটবে না, শুধু ইম্প্রেশন বাড়বে
//     if (action === "end") {
//       ad.impressions += 1;
//       await ad.save();
//       return res.json({
//         success: true,
//         counted: true,
//         message: "End view recorded.",
//       });
//     }

//     // কেস ২: ৫ সেকেন্ড পর স্কিপ বা বিজ্ঞাপনে ক্লিক (action === "skip" || action === "click")
//     if (action === "skip" || action === "click") {
//       // 🌟 ক) চেক করা যে বিজ্ঞপ্তির কন্টেনারে কয়েন ব্যালেন্স আছে কিনা
//       if (ad.remaining_budget < 1 || ad.status !== "active") {
//         ad.status = "out_of_budget";
//         await ad.save();
//         return res
//           .status(400)
//           .json({ success: false, message: "Ad is out of budget coins" });
//       }

//       // 🌟 খ) বিজ্ঞপ্তির বাজেট থেকে সরাসরি ১ কয়েন মাইনাস করা
//       ad.remaining_budget -= 1;

//       if (action === "click") {
//         ad.clicks += 1;
//         ad.impressions += 1;
//       } else {
//         ad.impressions += 1;
//       }

//       // বাজেট শেষ হয়ে গেলে স্ট্যাটাস অফ করা
//       if (ad.remaining_budget < 1) {
//         ad.status = "out_of_budget";
//       }
//       await ad.save();

//       // 🌟 গ) ভিডিও ক্রিয়েটরের ওয়ালেটে সরাসরি সেই ১ কয়েন যোগ করা
//       const coinPerClick = 1;

//       const wallet = await Wallet.findOneAndUpdate(
//         { userId: videoAuthor },
//         { $inc: { coinEarned: coinPerClick } },
//         { upsert: true, new: true, setDefaultsOnInsert: true },
//       );

//       // 🌟 আপনার হিসাব: 1000 coin = 1 cent
//       if (wallet.coinEarned >= 1000) {
//         const newCent = Math.floor(wallet.coinEarned / 1000);
//         wallet.sentEarned += newCent;
//         wallet.coinEarned = wallet.coinEarned % 1000;
//       }

//       // 🌟 আপনার হিসাব: 100 cent = 1 USD
//       if (wallet.sentEarned >= 100) {
//         const newUsd = Math.floor(wallet.sentEarned / 100);
//         wallet.usdEarned += newUsd;
//         wallet.sentEarned = wallet.sentEarned % 100;
//       }

//       await wallet.save();

//       return res.json({
//         success: true,
//         counted: true,
//         actionType: action,
//         coinTransferred: coinPerClick,
//         adRemainingCoins: ad.remaining_budget,
//       });
//     }

//     return res.status(400).json({ message: "Invalid action type" });
//   } catch (error) {
//     return res.status(500).json({ message: error.message });
//   }
// };

export const deleteAdCampaign = async (req, res) => {
  try {
    const { adId } = req.params;
    const advertiserId = req.user._id; // কারেন্ট লগইন থাকা প্রোভাইডার

    // ১. ডাটাবেস থেকে ওই প্রোভাইডারের নির্দিষ্ট বিজ্ঞাপনটি খোঁজা
    const ad = await Ad.findOne({ _id: adId, advertiserId });
    if (!ad) {
      return res
        .status(404)
        .json({ success: false, message: "বিজ্ঞাপনটি পাওয়া যায়নি" });
    }

    // ২. যদি বিজ্ঞপ্তিতে এখনো বাকি বাজেট (remaining_budget) থাকে, তবে তার ৫০% রিফান্ড করা
    if (ad.remaining_budget > 0) {
      // 🌟 ক) অবশিষ্টাংশ বাজেটের ৫০% বের করা (পেনাল্টি কাটার পর যা ফেরত পাবে)
      const refundableCoins = ad.remaining_budget * 0.5;

      // খ) রিফান্ডযোগ্য কয়েনকে ডলারে রূপান্তর করা (১ USD = ১,০০,০০০ Coins)
      const refundUsdAmount = refundableCoins / 100000;

      // গ) বিজ্ঞাপনদাতার মেইন ওয়ালেটে শুধুমাত্র ৫০% ডলার প্লাস করা
      await User.findByIdAndUpdate(advertiserId, {
        $inc: { balance: refundUsdAmount },
      });

      // ঘ) ট্রানজেকশন হিস্ট্রিতে ৫০% রিফান্ডের স্পষ্ট রেকর্ড তৈরি করা
      await Transaction.create({
        userId: advertiserId,
        type: "own",
        amount: refundUsdAmount,
        reference: `50% Refunded (Deleted Campaign): ${ad.title?.slice(0, 20)}`,
        status: "completed",
      });
    }

    // ৫. ✅ ওয়াসাবি স্টোরেজ থেকে মিডিয়া ফাইলটি চিরতরে মুছে ফেলা (আপনার মেথড অনুযায়ী)
    if (ad.media && ad.media.key && ad.adCategory=='other') {
      try {
        const keys = [ad.media.key];

        console.log("Attempting to delete media from Wasabi:", keys);
        const out = await deleteManyFromWasabi(keys);
        console.log("Wasabi delete response:", out);
      } catch (wasabiError) {
        // কোনো কারণে ওয়াসাবি থেকে ডিলিট ফেল করলেও যেন ডাটাবেস প্রসেস না আটকায় তার জন্য লগ রাখা হলো
        console.error(
          "Failed to delete media from Wasabi storage:",
          wasabiError.message,
        );
      }
    }

    // ৪. ডাটাবেস থেকে বিজ্ঞাপনটি চিরতরে মুছে ফেলা
    await Ad.findByIdAndDelete(adId);

    return res.status(200).json({
      success: true,
      message:
        "বিজ্ঞাপনটি সফলভাবে ডিলিট করা হয়েছে এবং বাকি বাজেটের ৫০% ডলার ওয়ালেটে রিফান্ড করা হয়েছে।",
    });
  } catch (error) {
    console.error("Delete Ad Error:", error);
    return res.status(500).json({ success: false, message: "সার্ভার সমস্যা" });
  }
};
