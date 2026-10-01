import { Router, raw } from "express";
import { paystackWebhook } from "../controllers/webhook.controller";

const router = Router();

// We need the raw body to verify Paystack's HMAC signature
router.post(
	"/paystack",
	raw({ type: "*/*" }),
	(req, _res, next) => {
		(req as any).rawBody = req.body;
		next();
	},
	paystackWebhook,
);

export default router;
