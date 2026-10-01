/**
 * Seed script — creates a superadmin, sample products, a mix rule,
 * a sample collection, and a sample card series.
 *
 * Run: pnpm --filter @nutrifriz/api seed
 */
import { connectDatabase, disconnectDatabase } from "../config/db";
import { logger } from "../config/logger";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { Collection } from "../models/Collection";
import { MixRule } from "../models/MixRule";
import { CardSeries } from "../models/CardSeries";
import { hashPassword } from "../utils/password";
import { toSlug } from "../utils/slugify";

async function run() {
	await connectDatabase();

	// Superadmin
	const adminEmail = process.env.SUPERADMIN_EMAIL ?? "admin@nutrifriz.com";
	const existing = await User.findOne({ email: adminEmail });
	if (!existing) {
		await User.create({
			email: adminEmail,
			passwordHash: await hashPassword(
				process.env.SUPERADMIN_PASSWORD ?? "ChangeMe123!",
			),
			firstName: "Nutrifriz",
			lastName: "Admin",
			role: "admin",
			emailVerified: true,
		});
		logger.info({ email: adminEmail }, "Superadmin created");
	}

	// Fruits
	const fruits = ["Mango", "Strawberry", "Pineapple", "Banana", "Apple"];
	const createdProducts = [];

	for (const fruit of fruits) {
		const slug = toSlug(fruit);
		const existingProduct = await Product.findOne({ slug });
		if (existingProduct) {
			createdProducts.push(existingProduct);
			continue;
		}
		const product = await Product.create({
			slug,
			name: `Freeze-Dried ${fruit}`,
			category: "fruit",
			fruit,
			shortDescription: `Crisp, sweet freeze-dried ${fruit.toLowerCase()} — real fruit, real crunch.`,
			description: `Our freeze-dried ${fruit.toLowerCase()} preserves the natural flavour, colour and nutrients of fresh produce. No additives. No sugar. Just fruit.`,
			images: [],
			packSizes: [
				{
					size: "30g",
					price: 3500,
					sku: `NFZ-${slug.toUpperCase()}-30`,
					stock: 100,
				},
				{
					size: "50g",
					price: 5200,
					sku: `NFZ-${slug.toUpperCase()}-50`,
					stock: 100,
				},
			],
			ingredients: [fruit],
			nutrition: {
				calories: 120,
				protein: 1,
				carbs: 28,
				sugar: 20,
				fibre: 3,
				fat: 0.5,
			},
			storage: "Store in a cool, dry place. Reseal after opening.",
			shelfLife: "12 months unopened",
			shippingInfo: "Ships within 24 hours across Nigeria.",
			status: "published",
			isBuildYourMixEligible: true,
			isFeatured: fruit === "Mango",
			tags: ["fruit", "snack", "healthy", "freeze-dried"],
		});
		createdProducts.push(product);
	}

	logger.info({ count: createdProducts.length }, "Fruits seeded");

	// Mix rules
	for (const pack of [
		{ size: "30g", grams: 30, price: 130 },
		{ size: "50g", grams: 50, price: 120 },
	]) {
		const exists = await MixRule.findOne({ packSize: pack.size });
		if (exists) continue;
		await MixRule.create({
			packSize: pack.size,
			minFruits: 2,
			maxFruits: 4,
			minGramsPerFruit: 5,
			pricePerGram: pack.price,
			totalGrams: pack.grams,
			allowedFruitIds: createdProducts.map((p) => p._id),
			isActive: true,
		});
	}

	logger.info("Mix rules seeded");

	// Sample collection
	const collectionSlug = "discovery-box";
	const existingCollection = await Collection.findOne({ slug: collectionSlug });
	if (!existingCollection) {
		await Collection.create({
			slug: collectionSlug,
			name: "Discovery Box",
			occasion: "Discovery",
			description:
				"A curated introduction to freeze-dried fruit — five flavours, one box.",
			image: "",
			items: createdProducts
				.slice(0, 5)
				.map((p) => ({ productId: p._id, qty: 1 })),
			pricing: { type: "sum-discount", discountPct: 10 },
			status: "published",
			isFeatured: true,
		});
		logger.info("Discovery Box seeded");
	}

	// Card series
	const seriesCode = "SERIES-01";
	const series = await CardSeries.findOne({ code: seriesCode });
	if (!series) {
		await CardSeries.create({
			code: seriesCode,
			name: "Origin Series",
			description: "The first Nutrifriz Crunch Card collection.",
			totalCards: 50,
			status: "active",
		});
		logger.info("Card series seeded");
	}

	await disconnectDatabase();
	logger.info("Seed complete");
	process.exit(0);
}

run().catch((err) => {
	logger.error({ err }, "Seed failed");
	process.exit(1);
});
