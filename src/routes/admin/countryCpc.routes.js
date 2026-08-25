import express from "express";
import {
  getCountryCpcs,
  getCountryCpc,
  updateCountryCpc,
} from "../../controllers/admin/countryCpc.controller.js";

const router = express.Router();

router.get("/cpc-all", getCountryCpcs);
router.get("/:code-single", getCountryCpc);
router.put("/cpc-update", updateCountryCpc);

export default router;
