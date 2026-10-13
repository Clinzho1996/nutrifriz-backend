/**
 * Seed script — creates a superadmin, sample products, a mix rule,
 * a sample collection, and a sample card series.
 *
 * Run: pnpm --filter @nutrifriz/api seed
 */
import { connectDatabase, disconnectDatabase } from "../config/db";
import { logger } from "../config/logger";

async function run() {
	await connectDatabase();

	// Categories
	const { Category } = await import("../models/Category");
	const defaultCategories = [
		{ name: "Freeze-Dried Fruits", slug: "freeze-dried-fruits", order: 1 },
		{ name: "Fruit Mixes", slug: "fruit-mixes", order: 2 },
		{ name: "Collections", slug: "collections", order: 3 },
		{ name: "Gift Boxes", slug: "gift-boxes", order: 4 },
	];

	for (const cat of defaultCategories) {
		const exists = await Category.findOne({ slug: cat.slug });
		if (!exists) {
			await Category.create(cat);
		}
	}
	logger.info("Categories seeded");

	await disconnectDatabase();
	logger.info("Seed complete");
	process.exit(0);
}

run().catch((err) => {
	logger.error({ err }, "Seed failed");
	process.exit(1);
});
