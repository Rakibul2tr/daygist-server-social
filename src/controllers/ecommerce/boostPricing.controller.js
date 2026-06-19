// src/controllers/BoostPricing.controller.js
import BoostPricing from "../../models/ecommarce/BoostPrising.model.js";

// 🔹 CREATE
export const createBoostPricing = async (req, res) => {
  try {
    const { tier, price, day } = req.body;

    const exists = await BoostPricing.findOne({ tier });
    if (exists) {
      return res.status(400).json({ message: "Tier already exists" });
    }

    const boost = await BoostPricing.create({
      tier,
      price,
      defaultDays: day,
    });

    res.status(201).json({ success: true, data: boost });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 GET ALL
export const getAllBoostPricing = async (req, res) => {
  try {
    const list = await BoostPricing.find({ isActive: true }).sort({
      createdAt: -1,
    });

    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 GET SINGLE
export const getBoostByTier = async (req, res) => {
  try {
    const { tier } = req.params;

    const boost = await BoostPricing.findOne({ tier, isActive: true });

    if (!boost) {
      return res.status(404).json({ message: "Boost not found" });
    }

    res.json({ success: true, data: boost });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 UPDATE
export const updateBoostPricing = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, day } = req.body;

    const updated = await BoostPricing.findByIdAndUpdate(
      id,
      { price, defaultDays:day },
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({ message: "Boost not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 DELETE (Soft delete)
export const deleteBoostPricing = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await BoostPricing.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    res.json({ success: true, message: "Boost disabled" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
