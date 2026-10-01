import { Router } from "express";
import * as ctrl from "../controllers/collection.controller";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
	createCollectionSchema,
	updateCollectionSchema,
	listCollectionsQuerySchema,
} from "../validators/collection.validator";
import { z } from "zod";

const router = Router();
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);

// Public
router.get("/", validate({ query: listCollectionsQuerySchema }), ctrl.list);
router.get("/slug/:slug", ctrl.getBySlug);

// Admin
router.get(
	"/admin/:id",
	requireAuth,
	requireAdmin,
	validate({ params: z.object({ id: objectId }) }),
	ctrl.getById,
);
router.post(
	"/admin",
	requireAuth,
	requireAdmin,
	validate({ body: createCollectionSchema }),
	ctrl.create,
);
router.patch(
	"/admin/:id",
	requireAuth,
	requireAdmin,
	validate({
		params: z.object({ id: objectId }),
		body: updateCollectionSchema,
	}),
	ctrl.update,
);
router.delete(
	"/admin/:id",
	requireAuth,
	requireAdmin,
	validate({ params: z.object({ id: objectId }) }),
	ctrl.remove,
);

export default router;
