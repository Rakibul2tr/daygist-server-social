// controllers/countryCpc.controller.js

import CountryCpc from "../../models/countryCpc/countryCpc.model.js";

// =========================
// GET ALL
// =========================
export const getCountryCpcs = async (req, res) => {
  try {
    const countries = await CountryCpc.find().sort({ name: 1 }).lean();

    return res.json({
      success: true,
      data: countries,
    });
  } catch (error) {
    console.error("getCountryCpcs:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get country CPCs",
    });
  }
};

// =========================
// GET SINGLE
// =========================
export const getCountryCpc = async (req, res) => {
  try {
    const country = await CountryCpc.findOne({
      code: req.params.code.toUpperCase(),
    }).lean();

    if (!country) {
      return res.status(404).json({
        success: false,
        message: "Country not found",
      });
    }

    return res.json({
      success: true,
      data: country,
    });
  } catch (error) {
    console.error("getCountryCpc:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get country CPC",
    });
  }
};

// =========================
// UPDATE SINGLE / MULTIPLE
// =========================
export const updateCountryCpc = async (req, res) => {
  try {
    const { countries, cpcType } = req.body;

    // =========================
    // VALIDATE CPC TYPE
    // =========================
    if (!["daygist", "others"].includes(cpcType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid CPC type",
      });
    }

    // =========================
    // VALIDATE COUNTRIES
    // =========================
    if (!Array.isArray(countries) || countries.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Countries array is required",
      });
    }

    for (const item of countries) {
      if (!item.code || item.cpc === undefined) {
        return res.status(400).json({
          success: false,
          message: "Each country must contain code and cpc",
        });
      }

      const cpc = Number(item.cpc);

      if (!Number.isFinite(cpc) || cpc < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid CPC value",
        });
      }
    }

    // =========================
    // UPDATE
    // =========================
    const updatedCountries = [];

    for (const item of countries) {
      const code = item.code.toUpperCase();
      const newCpc = Number(item.cpc);

      // Raw MongoDB document নাও
      const country = await CountryCpc.collection.findOne({
        code,
      });

      if (!country) {
        continue;
      }

      let currentCpc;

      // =========================
      // OLD STRUCTURE
      // cpc: 2
      // =========================
      if (typeof country.cpc === "number") {
        currentCpc = {
          daygist: 0,
          others: 0,
        };

        // পুরোনো CPC-কে Others হিসেবে রাখছি
        currentCpc.others = country.cpc;
      }

      // =========================
      // NEW STRUCTURE
      // cpc: {
      //   daygist: 0.5,
      //   others: 0.2
      // }
      // =========================
      else {
        currentCpc = {
          daygist: Number(country.cpc?.daygist ?? 0),
          others: Number(country.cpc?.others ?? 0),
        };
      }

      // Selected CPC update
      currentCpc[cpcType] = newCpc;

      // পুরো cpc object replace
      const updated = await CountryCpc.findOneAndUpdate(
        { code },
        {
          $set: {
            cpc: currentCpc,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      ).lean();

      if (updated) {
        updatedCountries.push(updated);
      }
    }

    return res.json({
      success: true,
      message: `${updatedCountries.length} country CPC updated successfully`,
      data: updatedCountries,
      modifiedCount: updatedCountries.length,
    });
  } catch (error) {
    console.error("updateCountryCpc:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update country CPC",
    });
  }
};