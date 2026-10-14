import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import * as ctrl from "../controllers/customer.controller";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { AppError } from "../utils/AppError";
import { listCustomersQuerySchema } from "../validators/customer.validator";

const router = Router();
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);

const csvUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		const ok =
			file.mimetype === "text/csv" ||
			file.mimetype === "application/vnd.ms-excel" ||
			file.originalname.toLowerCase().endsWith(".csv");
		if (!ok) return cb(new AppError(400, "Only CSV files are allowed"));
		cb(null, true);
	},
});

router.use(requireAuth, requireAdmin);

router.get("/", validate({ query: listCustomersQuerySchema }), ctrl.list);
router.get("/export", ctrl.exportCsv);
router.get("/import-template", ctrl.importTemplate);
router.post("/import", csvUpload.single("file"), ctrl.importCsv);
router.get(
	"/:id",
	validate({ params: z.object({ id: objectId }) }),
	ctrl.getById,
);

export default router;
