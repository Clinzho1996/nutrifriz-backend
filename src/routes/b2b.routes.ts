import { Router } from "express";
import * as ctrl from "../controllers/b2b.controller";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
	createB2BLeadSchema,
	updateB2BLeadSchema,
	addB2BNoteSchema,
	listB2BQuerySchema,
} from "../validators/b2b.validator";
import { z } from "zod";

const router = Router();
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);

// Public
router.post("/leads", validate({ body: createB2BLeadSchema }), ctrl.create);

// Admin
router.get(
	"/admin/leads",
	requireAuth,
	requireAdmin,
	validate({ query: listB2BQuerySchema }),
	ctrl.list,
);
router.get(
	"/admin/leads/:id",
	requireAuth,
	requireAdmin,
	validate({ params: z.object({ id: objectId }) }),
	ctrl.getById,
);
router.patch(
	"/admin/leads/:id",
	requireAuth,
	requireAdmin,
	validate({ params: z.object({ id: objectId }), body: updateB2BLeadSchema }),
	ctrl.update,
);
router.post(
	"/admin/leads/:id/notes",
	requireAuth,
	requireAdmin,
	validate({ params: z.object({ id: objectId }), body: addB2BNoteSchema }),
	ctrl.addNote,
);

export default router;
