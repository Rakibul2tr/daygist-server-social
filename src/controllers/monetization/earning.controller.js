import mongoose from "mongoose";
import Post from "../../models/post/post.model.js"; // আপনার সঠিক পাথ দিন

export const getMyVideoEarnings = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 50, 1);

    const items = await Post.aggregate([
      // 🌟 ক) ফিল্টারিং: শুধুমাত্র ডিলিট না হওয়া, নিজের তৈরি করা, সাধারণ ভিডিও
      // এবং যেগুলোতে ন্যূনতম ১টি ক্লিক/ভিউ হয়েছে (videoClickCount > 0)
      {
        $match: {
          isDeleted: false,
          author: new mongoose.Types.ObjectId(userId),
          type: "video",
          category: "general",
          videoClickCount: { $exists: true, $gt: 0 }, // ১ বা তার বেশি ক্লিক থাকা বাধ্যতামূলক
        },
      },

      // খ) সর্টিং: সবচেয়ে বেশি আয় বা ক্লিক হওয়া ভিডিওগুলো একদম উপরে থাকবে
      { $sort: { videoClickCount: -1, createdAt: -1 } },

      // গ) পেজিনেশন
      { $skip: (page - 1) * limit },
      { $limit: limit },

      // ঘ) ইউজারের প্রোফাইল ডেটা আনা (ঐচ্ছিক, ইউআই এর জন্য দরকারি)
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: "$author" },

      // 🌟 ঙ) রিয়েল-টাইম আর্নিং ক্যালকুলেশন মেকানিজম (1 click = 1 coin = $0.0001)
      {
        $addFields: {
          // মোট উপার্জিত কয়েন (১ ক্লিক = ১ কয়েন)
          totalCoinsEarned: "$videoClickCount",
          // ডলারে কনভার্ট করার গাণিতিক হিসাব ($multiply দিয়ে ০.০০০১ গুণ করা হলো)
          usdValueEarned: { $multiply: ["$videoClickCount", 0.0001] },
        },
      },

      // চ) পরিচ্ছন্ন আউটপুট প্রজেকশন
      {
        $project: {
          "author._id": 1,
          "author.name": 1,
          "author.username": 1,
          "author.avatar": 1,

          type: 1,
          text: 1,
          description: 1,
          medias: 1,
          category: 1,
          subCategory: 1,

          viewCount: 1,
          likeCount: 1,
          commentCount: 1,

          videoClickCount: 1, // কতগুলো ক্লিক/ভিউ হয়েছে বিজ্ঞপ্তির মাধ্যমে
          totalCoinsEarned: 1, // কয়েন সংখ্যা
          usdValueEarned: 1, // সরাসরি ডলার ভ্যালু
          createdAt: 1,
        },
      },
    ]);

    // ছ) টোটাল কতগুলো ভিডিও থেকে ইনকাম হচ্ছে তার ওভারঅল কাউন্ট
    const totalEarningVideos = await Post.countDocuments({
      isDeleted: false,
      author: userId,
      type: "video",
      category: "general",
      videoClickCount: { $gt: 0 },
    });

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
      summary: {
        totalVideosWithEarnings: totalEarningVideos,
        currentPage: page,
        totalPages: Math.ceil(totalEarningVideos / limit),
      },
    });
  } catch (error) {
    console.error("Get Video Earnings Error:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to fetch earnings",
      });
  }
};
