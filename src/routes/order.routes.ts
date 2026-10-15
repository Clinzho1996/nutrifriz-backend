import { Router } from "express";
import { z } from "zod";
import * as ctrl from "../controllers/order.controller";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
	createManualOrderSchema,
	listOrdersQuerySchema,
	updateFulfilmentSchema,
	updateOrderStatusSchema,
} from "../validators/order.validator";

const router = Router();
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);

// Customer
router.get("/me", requireAuth, ctrl.myOrders);

// Admin — manual order creation (literal BEFORE dynamic)
router.post(
	"/admin/manual",
	requireAuth,
	requireAdmin,
	validate({ body: createManualOrderSchema }),
	ctrl.createManual,
);

router.get(
	"/admin",
	requireAuth,
	requireAdmin,
	validate({ query: listOrdersQuerySchema }),
	ctrl.list,
);
router.get(
	"/admin/number/:orderNumber",
	requireAuth,
	requireAdmin,
	ctrl.getByNumber,
);
router.get(
	"/admin/:id",
	requireAuth,
	requireAdmin,
	validate({ params: z.object({ id: objectId }) }),
	ctrl.getById,
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
