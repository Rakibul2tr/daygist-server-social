import express from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import { createAdCampaign, deleteAdCampaign, getAdsForUsers, getAdvertiserCampaigns, handleAdAction, renewAdCampaign } from "../../controllers/ads/ads.Controller.js";

const router = express.Router();

/**
 * 📢 বিজ্ঞাপনদাতার রাউট (Advertiser Route)
 * POST /api/ads/create
 * ডেসক্রিপশন: প্রোভাইডার যখন ডলার দিয়ে নতুন কাস্টম ক্যাম্পেইন তৈরি করবে (ডলার থেকে ১,০০,০০০ দিয়ে গুণ হয়ে কয়েন কনভার্ট হবে)।
 */
router.post("/create", authGuard, createAdCampaign);

router.get("/my-campaigns", authGuard, getAdvertiserCampaigns);
router.post("/renew/:adId", authGuard, renewAdCampaign);

/**
 * 📺 সাধারণ ব্যবহারকারীর রাউট (User Fetch Route)
 * GET /api/ads/fetch
 * ডেসক্রিপশন: ভিডিও প্লেয়ার বা ফিডের জন্য অ্যাক্টিভ এবং কয়েন ব্যালেন্স থাকা বিজ্ঞাপন র‍্যান্ডমলি তুলে আনা।
 * উদাহরণ কুয়েরি: /api/ads/fetch?placement=video_player
 */
router.get("/fetch", authGuard, getAdsForUsers);

/**
 * 💸 অ্যাড অ্যাকশন ও রিওয়ার্ড রাউট (Ad Action & Skip / Click / End Route)
 * POST /api/ads/action/:postId
 * ডেসক্রিপশন: ইউজার বিজ্ঞাপনে ক্লিক করলে (click) বা ৫ সেকেন্ড পর স্কিপ করলে (skip) বিজ্ঞপ্তির বাজেট থেকে ১ কয়েন কাটবে এবং ভিডিওর মেইন লেখকের ওয়ালেটে যোগ হবে। আর ভিডিও শেষ হলে (end) শুধু ভিউ রেকর্ড হবে।
 */
router.post("/action/:postId", authGuard, handleAdAction);

router.delete("/delete/:adId", authGuard, deleteAdCampaign);

export default router;
