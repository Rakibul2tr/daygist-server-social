import { Router } from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import { addToCart, cartItemAction, getCart, removeCartItem } from "../../controllers/ecommerce/cart.controller.js";
import { getMyOrders, getOrderDetails, placeOrder } from "../../controllers/ecommerce/order.controller.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js"; // আপনার isAdmin middleware
import { isAdminOrModerator } from "../../middleware/isAdminMiddleware.js";


const router = Router();


router.get("/cart", authGuard, getCart);
router.post("/cart/add", authGuard, addToCart);
router.delete("/cart/remove/:productId", authGuard, removeCartItem);
router.patch("/cart/qty", authGuard, cartItemAction);

router.post("/orders", authGuard, placeOrder);
router.get("/orders", authGuard, getMyOrders);
router.get("/orders/:id", authGuard, getOrderDetails);






export default router;
