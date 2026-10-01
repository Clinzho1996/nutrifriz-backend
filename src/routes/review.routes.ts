import { Router } from "express";
import * as ctrl from "../controllers/review.controller";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
	createReviewSchema,
	moderateReviewSchema,
	listReviewsQuerySchema,
} from "../validators/review.validator";
import { z } from "zod";

const router = Router();
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);

// Customer
router.post(
	"/",
	requireAuth,
	validate({ body: createReviewSchema }),
	ctrl.create,
);

// Admin
router.get(
	"/admin",
	requireAuth,
	requireAdmin,
	validate({ query: listReviewsQuerySchema }),
	ctrl.list,
);
router.patch(
	"/admin/:id",
	requireAuth,
	requireAdmin,
	validate({ params: z.object({ id: objectId }), body: moderateReviewSchema }),
	ctrl.moderate,
);
router.delete(
	"/admin/:id",
	requireAuth,
	requireAdmin,
	validate({ params: z.object({ id: objectId }) }),
	ctrl.remove,
);

export default router;
