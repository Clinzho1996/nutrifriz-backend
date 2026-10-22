import { Request, Response } from "express";
import { Types } from "mongoose";
import { Category } from "../models/Category";
import { Collection } from "../models/Collection";
import { Product } from "../models/Product";
import { ok } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * GET /shop/all
 *
 * Returns products AND/OR collections based on the selected category.
 * The category drives WHICH collection is queried — not just a filter within both.
 *
 * - categorySlug === undefined or 'all' → returns both
 * - categorySlug is a product category (has products) → returns only products
 * - categorySlug === 'collections' → returns only collections
 * - categorySlug === 'gift-boxes' → returns only gift-occasion collections
 */
export const listAll = asyncHandler(async (req: Request, res: Response) => {
	const q = (req.query.q as string)?.trim() || undefined;
	const categorySlug = (req.query.categorySlug as string) || undefined;
	const sort = (req.query.sort as string) || "featured";
	const limit = Math.min(Number(req.query.limit ?? 60), 200);

	// ── Resolve category intent ──────────────────────────
	let productCategoryId: Types.ObjectId | undefined;
	let returnProducts = true;
	let returnCollections = true;
	let collectionOccasion: string | undefined;

	if (categorySlug && categorySlug !== "all") {
		if (categorySlug === "collections") {
			// Explicit collections tab
			returnProducts = false;
			returnCollections = true;
		} else if (categorySlug === "gift-boxes") {
			returnProducts = false;
			returnCollections = true;
			collectionOccasion = "Gift";
		} else {
			// Any other slug — treat as a product category
			const category = await Category.findOne({ slug: categorySlug }).lean();
			if (!category) {
				// Unknown slug → return empty
				return ok(res, { products: [], collections: [], total: 0 });
			}
			productCategoryId = category._id as Types.ObjectId;
			returnProducts = true;
			returnCollections = false;
		}
	}

	// ── Build product filter ─────────────────────────────
	const productFilter: Record<string, unknown> = { status: "published" };
	if (productCategoryId) {
		productFilter.categoryId = productCategoryId;
	}
	if (q) {
		productFilter.$or = [
			{ name: new RegExp(q, "i") },
			{ shortDescription: new RegExp(q, "i") },
			{ tags: new RegExp(q, "i") },
		];
	}

	// ── Build collection filter ──────────────────────────
	const collectionFilter: Record<string, unknown> = { status: "published" };
	if (collectionOccasion) {
		collectionFilter.occasion = collectionOccasion;
	}
	if (q) {
		collectionFilter.name = new RegExp(q, "i");
	}

	// ── Sort mapping ──────────────────────────────────────
	// Mongo can't sort on 'packSizes.0.price'. Instead, sort by the min price
	// precomputed via aggregation. We run products through an aggregate pipeline
	// so price sorting is accurate.
	let productsPromise: Promise<any[]>;

	if (sort === "price-asc" || sort === "price-desc") {
		const direction = sort === "price-asc" ? 1 : -1;
		productsPromise = returnProducts
			? Product.aggregate([
					{ $match: productFilter },
					{
						$addFields: {
							_minPrice: { $min: "$packSizes.price" },
						},
					},
					{ $sort: { _minPrice: direction } },
					{ $limit: limit },
					{
						$lookup: {
							from: "categories",
							localField: "categoryId",
							foreignField: "_id",
							as: "categoryId",
						},
					},
					{
						$unwind: {
							path: "$categoryId",
							preserveNullAndEmptyArrays: true,
						},
					},
				])
			: Promise.resolve([]);
	} else if (sort === "newest") {
		productsPromise = returnProducts
			? Product.find(productFilter)
					.sort({ createdAt: -1 })
					.limit(limit)
					.populate("categoryId", "name slug")
					.lean()
			: Promise.resolve([]);
	} else {
		// featured (default)
		productsPromise = returnProducts
			? Product.find(productFilter)
					.sort({ isFeatured: -1, createdAt: -1 })
					.limit(limit)
					.populate("categoryId", "name slug")
					.lean()
			: Promise.resolve([]);
	}

	const [products, collections] = await Promise.all([
		productsPromise,
		returnCollections
			? Collection.find(collectionFilter)
					.sort({ isFeatured: -1, createdAt: -1 })
					.limit(limit)
					.populate("items.productId", "name slug images packSizes")
					.lean()
			: Promise.resolve([]),
	]);

	// Compute collection prices
	const collectionsWithPrice = await Promise.all(
		(collections as any[]).map(async (c) => {
			const subtotal = (c.items ?? []).reduce((sum: number, item: any) => {
				const product =
					typeof item.productId === "object" ? item.productId : null;
				if (!product) return sum;
				const firstPack = product.packSizes?.[0];
				if (!firstPack) return sum;
				return sum + firstPack.price * item.qty;
			}, 0);

			const computedPrice =
				c.pricing.type === "fixed"
					? (c.pricing.amount ?? 0)
					: Math.round(subtotal * (1 - (c.pricing.discountPct ?? 0) / 100));

			return { ...c, computedPrice };
		}),
	);

	return ok(res, {
		products,
		collections: collectionsWithPrice,
		total: products.length + collectionsWithPrice.length,
	});
});

export const listShopCategories = asyncHandler(
	async (_req: Request, res: Response) => {
		const categories = await Category.find({ isActive: true })
			.sort({ order: 1, name: 1 })
			.select("_id name slug description")
			.lean();
		return ok(res, categories);
	},
);
