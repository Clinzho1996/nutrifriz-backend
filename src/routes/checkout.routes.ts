import { Router } from "express";
import * as ctrl from "../controllers/checkout.controller";
import { optionalAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { checkoutInitSchema } from "../validators/order.validator";
import { z } from "zod";

const router = Router();

router.post(
	"/init",
	optionalAuth,
	validate({ body: checkoutInitSchema }),
	ctrl.initCheckout,
);
router.get(
	"/verify/:reference",
	validate({ params: z.object({ reference: z.string().min(5) }) }),
	ctrl.verifyCheckout,
);

export default router;
