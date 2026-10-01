import { Router } from "express";
import * as ctrl from "../controllers/product.controller";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
	createProductSchema,
	updateProductSchema,
	listProductsQuerySchema,
} from "../validators/product.validator";
import { z } from "zod";

const router = Router();
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);

// Public
router.get("/", validate({ query: listProductsQuerySchema }), ctrl.list);
router.get("/slug/:slug", ctrl.getBySlug);
router.get(
	"/:id/reviews",
	validate({ params: z.object({ id: objectId }) }),
	ctrl.listProductReviews,
);

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
	validate({ body: createProductSchema }),
	ctrl.create,
);
router.patch(
	"/admin/:id",
	requireAuth,
	requireAdmin,
	validate({ params: z.object({ id: objectId }), body: updateProductSchema }),
	ctrl.update,
);
router.delete(
	"/admin/:id",
	requireAuth,
	requireAdmin,
	validate({ params: z.object({ id: objectId }) }),
	ctrl.remove,
);

// Public detail (must be last to avoid capturing /admin)
router.get(
	"/:id",
	validate({ params: z.object({ id: objectId }) }),
	ctrl.getById,
);

export default router;
