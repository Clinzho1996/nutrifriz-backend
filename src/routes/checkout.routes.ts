import { Router } from "express";
import z from "zod";
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

router.get(
	"/verify/:reference",
	validate({ params: z.object({ reference: z.string().min(5) }) }),
	ctrl.verifyCheckout,
);

export default router;
