import { Router } from "express";
import * as ctrl from "../controllers/card.controller";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
	createSeriesSchema,
	updateSeriesSchema,
	issueCardsSchema,
	registerCardSchema,
	listCardsQuerySchema,
} from "../validators/card.validator";
import { z } from "zod";

const router = Router();
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);

// Customer
router.post(
	"/register",
	requireAuth,
	validate({ body: registerCardSchema }),
	ctrl.register,
);
router.get("/me/passport", requireAuth, ctrl.myPassport);

// Admin
router.get("/admin/series", requireAuth, requireAdmin, ctrl.listSeries);
router.post(
	"/admin/series",
	requireAuth,
	requireAdmin,
	validate({ body: createSeriesSchema }),
	ctrl.createSeries,
);
router.patch(
	"/admin/series/:id",
	requireAuth,
	requireAdmin,
	validate({ params: z.object({ id: objectId }), body: updateSeriesSchema }),
	ctrl.updateSeries,
);
router.post(
	"/admin/series/:id/issue",
	requireAuth,
	requireAdmin,
	validate({ params: z.object({ id: objectId }), body: issueCardsSchema }),
	ctrl.issueCards,
);
router.get(
	"/admin/cards",
	requireAuth,
	requireAdmin,
	validate({ query: listCardsQuerySchema }),
	ctrl.listCards,
);

export default router;
