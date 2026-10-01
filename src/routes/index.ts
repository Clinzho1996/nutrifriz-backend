import { Router } from "express";
import authRoutes from "./auth.routes";
import productRoutes from "./product.routes";
import collectionRoutes from "./collection.routes";
import mixRoutes from "./mix.routes";
import checkoutRoutes from "./checkout.routes";
import webhookRoutes from "./webhook.routes";
import orderRoutes from "./order.routes";
import reviewRoutes from "./review.routes";
import journalRoutes from "./journal.routes";
import b2bRoutes from "./b2b.routes";
import cardRoutes from "./card.routes";
import analyticsRoutes from "./analytics.routes";
import uploadRoutes from "./upload.routes";

const router = Router();

// Webhooks first (need raw body)
router.use("/webhooks", webhookRoutes);

router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/collections", collectionRoutes);
router.use("/mix", mixRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/orders", orderRoutes);
router.use("/reviews", reviewRoutes);
router.use("/journal", journalRoutes);
router.use("/b2b", b2bRoutes);
router.use("/cards", cardRoutes);
router.use("/admin/analytics", analyticsRoutes);
router.use("/admin/uploads", uploadRoutes);

router.get("/health", (_req, res) => {
	res.json({
		success: true,
		message: "Nutrifriz API is live",
		at: new Date().toISOString(),
	});
});

export default router;
