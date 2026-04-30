import mongoose from "mongoose";
import Block from "../../models/chat/block.model.js";

/**
 * POST /block/toggle
 * body: { userId }
 */
export const toggleBlockUser = async (req, res) => {
  try {
    const me = req.user?._id;
    const { userId } = req.body;

    if (!me) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    if (String(me) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot block yourself",
      });
    }

    const existing = await Block.findOne({
      blocker: me,
      blocked: userId,
    });

    let status = "";

    if (existing) {
      await Block.deleteOne({ _id: existing._id });
      status = "unblocked";
    } else {
      await Block.create({
        blocker: me,
        blocked: userId,
      });
      status = "blocked";
    }

    return res.status(200).json({
      success: true,
      message: `User ${status} successfully`,
      status,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message || "Block action failed",
    });
  }
};
