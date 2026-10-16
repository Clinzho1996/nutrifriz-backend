import { Router } from "express";
import { z } from "zod";
import * as ctrl from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import { requireAdmin } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
	addressSchema,
	changePasswordSchema,
	forgotPasswordSchema,
	loginSchema,
	refreshSchema,
	registerSchema,
	resetPasswordSchema,
	updateProfileSchema,
} from "../validators/auth.validator";

const router = Router();

router.post(
	"/register",
	authLimiter,
	validate({ body: registerSchema }),
	ctrl.register,
);
router.post("/login", authLimiter, validate({ body: loginSchema }), ctrl.login);
router.post("/refresh", validate({ body: refreshSchema }), ctrl.refresh);
router.post(
	"/forgot-password",
	authLimiter,
	validate({ body: forgotPasswordSchema }),
	ctrl.forgotPassword,
);
router.post(
	"/reset-password",
	authLimiter,
	validate({ body: resetPasswordSchema }),
	ctrl.resetPassword,
);

router.get("/me", requireAuth, ctrl.me);
router.patch(
	"/me",
	requireAuth,
	validate({ body: updateProfileSchema }),
	ctrl.updateProfile,
);
router.post(
	"/change-password",
	requireAuth,
	validate({ body: changePasswordSchema }),
	ctrl.changePassword,
);

router.get("/addresses", requireAuth, ctrl.listAddresses);
router.post(
	"/addresses",
	requireAuth,
	validate({ body: addressSchema }),
	ctrl.addAddress,
);
router.delete(
	"/addresses/:addressId",
	requireAuth,
	validate({ params: z.object({ addressId: z.string().min(1) }) }),
	ctrl.removeAddress,
);

// Admin
router.get("/users", requireAuth, requireAdmin, ctrl.listUsers);

export default router;
