import { Router } from "express";
import { flutterwaveWebhook } from "../controllers/webhook.controller";

const router = Router();

// Flutterwave does not require the raw body (unlike Paystack's HMAC).
// express.json() is already applied globally in app.ts, so this just works.
router.post("/flutterwave", flutterwaveWebhook);

// Keep the old Paystack route only if you still have pending orders.
// Delete this once all Paystack orders are settled.
// router.post('/paystack', paystackWebhook);

export default router;
