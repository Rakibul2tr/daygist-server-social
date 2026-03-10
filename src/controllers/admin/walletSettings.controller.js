

import WalletSettings from "../../models/wallet/WalletSettings.js";


/**
 * @desc    Get wallet settings (Admin)
 * @route   GET /api/admin/wallet-settings
 * @access  Admin
 */
export const getWalletSettings = async (req, res) => {
  try {
    let settings = await WalletSettings.findOne();

    // 🔹 First time create default document
    if (!settings) {
      settings = await WalletSettings.create({});
    }

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Get Wallet Settings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch wallet settings",
    });
  }
};

/**
 * @desc    Update wallet settings (Admin)
 * @route   PATCH /api/admin/wallet-settings
 * @access  Admin
 */
export const updateWalletSettings = async (req, res) => {
  try {
    const body = req.body || {};

    console.log("i am update");
    

    // 🔐 Allowed fields only (security)
    const update = {};

    // ---- toggles
    if ("wallet_enabled" in body)
      update.wallet_enabled = Boolean(body.wallet_enabled);

    if ("transfer_enabled" in body)
      update.transfer_enabled = Boolean(body.transfer_enabled);

    if ("withdraw_enabled" in body)
      update.withdraw_enabled = Boolean(body.withdraw_enabled);

    // ---- limits
    if ("max_transfer_amount" in body)
      update.max_transfer_amount = Number(body.max_transfer_amount);

    if ("min_withdraw_amount" in body)
      update.min_withdraw_amount = Number(body.min_withdraw_amount);

    // ---- payment methods
    if (body.payment_methods && typeof body.payment_methods === "object") {
      update.payment_methods = {};

      if ("paypal" in body.payment_methods)
        update.payment_methods.paypal = Boolean(
          body.payment_methods.paypal
        );

      if ("skrill" in body.payment_methods)
        update.payment_methods.skrill = Boolean(
          body.payment_methods.skrill
        );

      if ("bank" in body.payment_methods)
        update.payment_methods.bank = Boolean(
          body.payment_methods.bank
        );

      if ("custom" in body.payment_methods)
        update.payment_methods.custom = Boolean(
          body.payment_methods.custom
        );
    }

    let settings = await WalletSettings.findOne();

    if (!settings) {
      settings = new WalletSettings(update);
    } else {
      Object.assign(settings, update);
    }

    await settings.save();

    return res.status(200).json({
      success: true,
      message: "Wallet settings updated successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Update Wallet Settings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update wallet settings",
    });
  }
};
