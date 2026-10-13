import { Router } from "express";
import { z } from "zod";
import * as ctrl from "../controllers/category.controller";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
	createCategorySchema,
	listCategoriesQuerySchema,
	updateCategorySchema,
} from "../validators/category.validator";

const router = Router();
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);

// Public
router.get("/public", ctrl.listPublic);

// Admin
router.get(
	"/admin",
	requireAuth,
	requireAdmin,
	validate({ query: listCategoriesQuerySchema }),
	ctrl.list,
);
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
	validate({ body: createCategorySchema }),
	ctrl.create,
);
router.patch(
	"/admin/:id",
	requireAuth,
	requireAdmin,
	validate({ params: z.object({ id: objectId }), body: updateCategorySchema }),
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
