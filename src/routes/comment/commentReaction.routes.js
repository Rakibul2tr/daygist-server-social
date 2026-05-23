// FILE: src/routes/comment/comment.routes.js
import express from "express";

import { authGuard } from "../../middleware/authMiddleware.js";
import { reactToComment } from "../../controllers/comment/commentReaction.controller.js";

const router = express.Router();

// post comments
router.post("/:commentId/reaction", authGuard, reactToComment);

export default router;
