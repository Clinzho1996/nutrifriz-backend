import { Router } from "express";
import * as ctrl from "../controllers/mix.controller";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
	priceMixSchema,
	saveMixSchema,
	mixRuleSchema,
} from "../validators/mix.validator";

const router = Router();

// Public
router.get("/rules", ctrl.listRules);
router.post("/price", validate({ body: priceMixSchema }), ctrl.priceMix);
router.post(
	"/save",
	optionalAuth,
	validate({ body: saveMixSchema }),
	ctrl.saveMix,
);
router.get("/:id", ctrl.getMix);

// Auth
router.get("/me/all", requireAuth, ctrl.listMyMixes);
router.delete("/:id", requireAuth, ctrl.deleteMix);

// Admin
router.put(
	"/admin/rules",
	requireAuth,
	requireAdmin,
	validate({ body: mixRuleSchema }),
	ctrl.upsertRule,
);

export default router;
