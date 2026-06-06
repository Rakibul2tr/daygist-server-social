// controllers/adClickController.js

import mongoose from "mongoose";
import Post from "../../models/post/post.model.js";
import AdClick from "../../models/ads/adClick.model.js";
import User from "../../models/user/user.model.js";
import Wallet from "../../models/wallet/wallet.model.js";

export const addAdClick = async (req, res) => {
  try {
    const clickedBy = req.user?._id;
    const { postId } = req.params;

    if (!clickedBy) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({
        message: "Invalid postId",
      });
    }

    const post = await Post.findById(postId).select("author");

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const videoAuthor = post.author;

    // নিজের ভিডিওতে click করলে reward না
    if (String(videoAuthor) === String(clickedBy)) {
      return res.json({
        success: true,
        counted: false,
        message: "Own click ignored",
      });
    }

    const coinPerClick = 1;

    await AdClick.create({
      post: postId,
      videoAuthor,
      clickedBy,
      coinEarned: coinPerClick,
    });

    const wallet = await Wallet.findOneAndUpdate(
      { userId: videoAuthor },
      {
        $inc: {
          coinEarned: coinPerClick,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    // 1000 coin = 1 cent
    if (wallet.coinEarned >= 1000) {
      const newCent = Math.floor(wallet.coinEarned / 1000);

      wallet.sentEarned += newCent;
      wallet.coinEarned = wallet.coinEarned % 1000;
    }

    // 100 cent = 1 USD
    if (wallet.sentEarned >= 100) {
      const newUsd = Math.floor(wallet.sentEarned / 100);

      wallet.usdEarned += newUsd;
      wallet.sentEarned = wallet.sentEarned % 100;
    }

    await wallet.save();

    return res.json({
      success: true,
      counted: true,
      coinAdded: coinPerClick,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
