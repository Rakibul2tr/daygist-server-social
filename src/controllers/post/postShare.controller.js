import PostShare from "../../models/post/postShare.model.js";
import Post from "../../models/post/post.model.js";
import Ad from "../../models/ads/ad.model.js"; 
import mongoose from "mongoose";

export const sharePost = async (req, res) => {
  try {
    const me = req.user?._id;
    const postId = req.params.postId; // বিজ্ঞপ্তির ক্ষেত্রে এটি adId হবে
    const type = String(req.query.type || "post").toLowerCase(); // post অথবা ad

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid postId" });
    }

    // 🌟 ১. আপনার নতুন ডাইনামিক মডেল স্ট্রাকচার অনুযায়ী মঙ্গুজকে কালেকশন টাইপ চেনাচ্ছি
    const targetModel = type === "ad" ? "Ad" : "Post";

    // 🌟 ২. আপসার্ট (Upsert) রেকর্ড তৈরি হচ্ছে (একই ইউজার বারবার শেয়ার করলে কাউন্ট ডুপ্লিকেট হবে驶)
    const r = await PostShare.updateOne(
      { post: postId, user: me, targetType: targetModel },
      {
        $setOnInsert: {
          post: postId,
          user: me,
          targetType: targetModel,
        },
      },
      { upsert: true },
    );

    // 🌟 ৩. নতুন শেয়ার এন্ট্রি হলেই কেবল নির্দিষ্ট মেইন টেবিলের shareCount ফিল্ড ১ বৃদ্ধি পাবে
    if (r.upsertedCount === 1) {
      if (type === "ad") {
        await Ad.updateOne({ _id: postId }, { $inc: { shareCount: 1 } });
      } else {
        await Post.updateOne({ _id: postId }, { $inc: { shareCount: 1 } });
      }
    }

    return res.json({ success: true, shared: true });
  } catch (e) {
    console.error("Share API Error:", e);
    return res.status(500).json({ message: e?.message || "Share failed" });
  }
};

export const getPostShares = async (req, res) => {
  try {
    const postId = req.params.postId;
    const type = String(req.query.type || "post").toLowerCase(); // post অথবা ad

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid postId" });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    // 🌟 ১. আপনার নতুন ডাইনামিক মডেল স্ট্রাকচার অনুযায়ী সঠিক targetType ক্যাপিটালাইজেশন করা হলো
    const targetModel = type === "ad" ? "Ad" : "Post";

    // 🌟 ২. post এবং targetType দুই ফিল্ডেরই নিখুঁত ম্যাচিং কোয়েরি
    const rows = await PostShare.find({
      post: postId,
      targetType: targetModel,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name username avatar profilePic")
      .lean();

    const users = rows.map((r) => r.user).filter(Boolean);

    return res.json({ success: true, page, limit, users });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Fetch shares failed" });
  }
};


export const getDeepLinkPostHtml = async (req, res) => {
  try {
    const postId = req.params.id;

    // ডাটাবেস থেকে শুধু পোস্টের টাইটেল, ডেসক্রিপশন এবং ইমেজ নিয়ে আসা
    const post = await Post.findOne({ _id: postId, isDeleted: false })
      .populate("author", "name")
      .lean();

    if (!post) {
      return res.status(404).send("পোস্টটি পাওয়া যায়নি!");
    }

    // আপনার পোস্টের অবজেক্ট অনুযায়ী ডাটাগুলো ডাইনামিক করুন
    const title = post.title || `${post.author?.name || "User"}-এর পোস্ট`;
    const description =
      post.caption || post.content || "Daygist-এ পুরো পোস্টটি দেখুন।";
    const imageUrl = post.image || "https://daygist.com"; // পোস্টের ছবি না থাকলে ডিফল্ট ছবি

    // HTML রেসপন্স রিটার্ন করা
    return res.send(`
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        
        <!-- WhatsApp, Facebook, Messenger Rich Preview Tags -->
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:url" content="https://daygist.com{postId}" />
        <meta property="og:type" content="article" />
        
        <title>${title}</title>

        <!-- স্ক্রিপ্ট: ব্রাউজারে হিট করলেই অ্যাপ ওপেন করার চেষ্টা করবে -->
        <script type="text/javascript">
          window.location.href = "daygist://posts/${postId}"; 
          
          // যদি ২ সেকেন্ডের মধ্যে অ্যাপ ওপেন না হয় (অ্যাপ ইন্সটল না থাকলে), প্লে স্টোরে নিয়ে যাবে
          setTimeout(function() {
               window.location.href = "https://google.com";
          }, 2000);
        </script>
      </head>
      <body>
        <div style="text-align:center; margin-top:50px; font-family:sans-serif;">
          <h2>Opening Daygist App...</h2>
          <p>If the app does not open automatically, <a href="daygist://posts/${postId}">click here</a>.</p>
        </div>
      </body>
      </html>
    `);
  } catch (e) {
    return res.status(500).send("Something went wrong!");
  }
};
