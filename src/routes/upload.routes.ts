import { Router } from "express";
import * as ctrl from "../controllers/upload.controller";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";

const router = Router();

router.post("/sign", requireAuth, requireAdmin, ctrl.signCloudinaryUpload);

export default router;
