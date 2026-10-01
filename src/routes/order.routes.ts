import { Router } from "express";
import * as ctrl from "../controllers/order.controller";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
	listOrdersQuerySchema,
	updateOrderStatusSchema,
	updateFulfilmentSchema,
} from "../validators/order.validator";
import { z } from "zod";

const router = Router();
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);

// Customer
router.get("/me", requireAuth, ctrl.myOrders);

// Admin
router.get(
	"/admin",
	requireAuth,
	requireAdmin,
	validate({ query: listOrdersQuerySchema }),
	ctrl.list,
);
router.get(
	"/admin/:id",
	requireAuth,
	requireAdmin,
	validate({ params: z.object({ id: objectId }) }),
	ctrl.getById,
);
router.get(
	"/admin/number/:orderNumber",
	requireAuth,
	requireAdmin,
	ctrl.getByNumber,
);
router.patch(
	"/admin/:id/status",
	requireAuth,
	requireAdmin,
	validate({
		params: z.object({ id: objectId }),
		body: updateOrderStatusSchema,
	}),
	ctrl.updateStatus,
);
router.patch(
	"/admin/:id/fulfilment",
	requireAuth,
	requireAdmin,
	validate({
		params: z.object({ id: objectId }),
		body: updateFulfilmentSchema,
	}),
	ctrl.updateFulfilment,
);

export default router;
