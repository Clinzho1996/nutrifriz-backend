import { Router } from "express";
import * as ctrl from "../controllers/shop.controller";

const router = Router();

router.get("/categories", ctrl.listShopCategories);
router.get("/all", ctrl.listAll);
router.get("/shipping", ctrl.getShippingOptions);

export default router;
