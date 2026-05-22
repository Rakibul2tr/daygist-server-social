import mongoose from "mongoose";
import Setting from "../../models/settings/earnRuls.model.js";

export const updateSetting = async (req, res) => {
  try {
    const {
      viewRate,
      likeRate,
      shareRate,
      commentRate,
      postCreateEnable,
      generalVideoEnabled,
      reelEnabled,
      ecommerceEnabled,
      minWatchSeconds,
      minWithdrawAmount,
      earningEnabled,
    } = req.body;

    let setting = await Setting.findOne();

    if (!setting) {
      setting = await Setting.create({
        viewRate,
        likeRate,
        shareRate,
        commentRate,
        postCreateEnable,
        generalVideoEnabled,
        reelEnabled,
        ecommerceEnabled,
        minWatchSeconds,
        minWithdrawAmount,
        earningEnabled,
      });
    } else {
      Object.assign(setting, {
        viewRate,
        likeRate,
        shareRate,
        commentRate,
        postCreateEnable,
        generalVideoEnabled,
        reelEnabled,
        ecommerceEnabled,
        minWatchSeconds,
        minWithdrawAmount,
        earningEnabled,
      });

      await setting.save();
    }

    return res.json({
      success: true,
      setting,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const getSetting = async (req, res) => {
  try {
    const setting = await Setting.findOne();

    return res.json({
      success: true,
      setting,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
