import EcomBanner from "../../models/ecommarce/EcomBanner.js";


export const getActiveBanners = async (req, res) => {
  try {
    const now = new Date();
    const banners = await EcomBanner.find({
      isActive: true,
      $and: [
        { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
        { $or: [{ endAt: null }, { endAt: { $gte: now } }] },
      ],
    })
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    res.json({ success: true, data: banners });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// Admin
export const createBanner = async (req, res) => {
  try {
    const doc = await EcomBanner.create(req.body);
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const updateBanner = async (req, res) => {
  try {
    const doc = await EcomBanner.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const deleteBanner = async (req, res) => {
  try {
    await EcomBanner.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
