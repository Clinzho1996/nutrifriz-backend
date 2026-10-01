import { Router } from "express";
import * as ctrl from "../controllers/analytics.controller";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/overview", ctrl.overview);
router.get("/top-products", ctrl.topProducts);
router.get("/sales-trend", ctrl.salesTrend);
router.get("/category-breakdown", ctrl.categoryBreakdown);

export default router;
