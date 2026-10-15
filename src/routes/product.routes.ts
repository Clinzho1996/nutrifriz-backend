import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import * as importCtrl from "../controllers/product-import.controller";
import * as ctrl from "../controllers/product.controller";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { AppError } from "../utils/AppError";
import {
	createProductSchema,
	listProductsQuerySchema,
	updateProductSchema,
} from "../validators/product.validator";

const router = Router();
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);

// CSV upload middleware — scoped to the product import route only
const csvUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		const ok =
			file.mimetype === "text/csv" ||
			file.mimetype === "application/vnd.ms-excel" ||
			file.originalname.toLowerCase().endsWith(".csv");
		if (!ok) return cb(new AppError(400, "Only CSV files are allowed"));
		cb(null, true);
	},
});

// ── Public ─────────────────────────────────────────────
router.get("/", validate({ query: listProductsQuerySchema }), ctrl.list);
router.get("/slug/:slug", ctrl.getBySlug);
router.get(
	"/:id/reviews",
	validate({ params: z.object({ id: objectId }) }),
	ctrl.listProductReviews,
);

// ── Admin — import (literal segments BEFORE /admin/:id) ─
router.get(
	"/admin/import-template",
	requireAuth,
	requireAdmin,
	importCtrl.importTemplate,
);
router.post(
	"/admin/import",
	requireAuth,
	requireAdmin,
	csvUpload.single("file"),
	importCtrl.importCsv,
);

// ── Admin — dynamic segments ───────────────────────────
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

// ── Public detail (LAST — wildcard catch) ──────────────
router.get(
	"/:id",
	validate({ params: z.object({ id: objectId }) }),
	ctrl.getById,
);

export default router;
