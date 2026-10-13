import { Router } from "express";
import * as ctrl from "../controllers/upload.controller";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";

const router = Router();

// Both admin-only. Staff included via requireAdmin.
router.post("/sign", requireAuth, requireAdmin, ctrl.signCloudinaryUpload);
router.post(
	"/batch",
	requireAuth,
	requireAdmin,
	ctrl.uploadMiddleware,
	ctrl.uploadBatch,
);

export default router;
