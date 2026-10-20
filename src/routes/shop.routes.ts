import { Router } from "express";
import * as ctrl from "../controllers/shop.controller";

const router = Router();

router.get("/categories", ctrl.listShopCategories);
router.get("/all", ctrl.listAll);

export default router;
