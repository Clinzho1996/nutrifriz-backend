import { Router } from "express";
import * as ctrl from "../controllers/checkout.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { checkoutInitSchema } from "../validators/order.validator";

const router = Router();

router.post(
	"/init",
	requireAuth,
	validate({ body: checkoutInitSchema }),
	ctrl.initCheckout,
);

export default router;
