import { Router } from "express";
import { z } from "zod";
import * as ctrl from "../controllers/journal.controller";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
	createJournalPostSchema,
	listJournalQuerySchema,
	updateJournalPostSchema,
} from "../validators/journal.validator";

const router = Router();
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);

// ── Public ─────────────────────────────────────────────
router.get("/", validate({ query: listJournalQuerySchema }), ctrl.list);
router.get("/slug/:slug", ctrl.getBySlug);

// ── Admin ──────────────────────────────────────────────
router.post(
	"/admin",
	requireAuth,
	requireAdmin,
	validate({ body: createJournalPostSchema }),
	ctrl.create,
);
router.get(
	"/admin/:id",
	requireAuth,
	requireAdmin,
	validate({ params: z.object({ id: objectId }) }),
	ctrl.getById,
);
router.patch(
	"/admin/:id",
	requireAuth,
	requireAdmin,
	validate({
		params: z.object({ id: objectId }),
		body: updateJournalPostSchema,
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
