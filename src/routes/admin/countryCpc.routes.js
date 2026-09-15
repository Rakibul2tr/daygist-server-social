import express from "express";
import {
  getCountryCpcs,
  getCountryCpc,
  updateCountryCpc,
} from "../../controllers/admin/countryCpc.controller.js";
import {
  isAdmin,
} from "../../middleware/isAdminMiddleware.js";

const router = express.Router();

router.get("/cpc-all",isAdmin, getCountryCpcs);
router.get("/:code-single",isAdmin, getCountryCpc);
router.put("/cpc-update",isAdmin, updateCountryCpc);

export default router;
