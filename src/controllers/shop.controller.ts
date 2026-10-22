import { Request, Response } from "express";
import { Types } from "mongoose";
import { Category } from "../models/Category";
import { Collection } from "../models/Collection";
import { Product } from "../models/Product";
import { ok } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const listAll = asyncHandler(async (req: Request, res: Response) => {
	const q = (req.query.q as string)?.trim() || undefined;
	const categorySlug = (req.query.categorySlug as string) || undefined;
	const sort = (req.query.sort as string) || "featured";
	const limit = Math.min(Number(req.query.limit ?? 60), 200);

	// ── Decide what to query ──────────────────────────────
	let includeProducts = true;
	let includeCollections = true;
	let productCategoryId: Types.ObjectId | undefined;
	let collectionOccasion: string | undefined;

	if (categorySlug && categorySlug !== "all") {
		if (categorySlug === "collections") {
			includeProducts = false;
		} else if (categorySlug === "gift-boxes") {
			includeProducts = false;
			collectionOccasion = "Gift";
		} else {
			const category = await Category.findOne({ slug: categorySlug }).lean();
			if (!category) {
				return ok(res, { products: [], collections: [], total: 0 });
			}
			productCategoryId = category._id as Types.ObjectId;
			includeCollections = false;
		}
	}

	// ── Products ──────────────────────────────────────────
	let productsPromise: Promise<any[]> = Promise.resolve([]);

	if (includeProducts) {
		const productFilter: Record<string, unknown> = { status: "published" };
		if (productCategoryId) productFilter.categoryId = productCategoryId;
		if (q) {
			productFilter.$or = [
				{ name: new RegExp(q, "i") },
				{ shortDescription: new RegExp(q, "i") },
				{ tags: new RegExp(q, "i") },
			];
		}

		if (sort === "price-asc" || sort === "price-desc") {
			const direction = sort === "price-asc" ? 1 : -1;
			productsPromise = Product.aggregate([
				{ $match: { ...productFilter, "packSizes.0": { $exists: true } } },
				{ $addFields: { _minPrice: { $min: "$packSizes.price" } } },
				{ $sort: { _minPrice: direction, isFeatured: -1, createdAt: -1 } },
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
			]);
		} else if (sort === "newest") {
			productsPromise = Product.find(productFilter)
				.sort({ createdAt: -1 })
				.limit(limit)
				.populate("categoryId", "name slug")
				.lean();
		} else {
			productsPromise = Product.find(productFilter)
				.sort({ isFeatured: -1, createdAt: -1 })
				.limit(limit)
				.populate("categoryId", "name slug")
				.lean();
		}
	}

	// ── Collections — fetch WITHOUT sorting so we can sort by price later ──
	let collectionsPromise: Promise<any[]> = Promise.resolve([]);

	if (includeCollections) {
		const collectionFilter: Record<string, unknown> = { status: "published" };
		if (collectionOccasion) collectionFilter.occasion = collectionOccasion;
		if (q) collectionFilter.name = new RegExp(q, "i");

		collectionsPromise = Collection.find(collectionFilter)
			.limit(limit * 5) // fetch enough to sort accurately
			.populate("items.productId", "name slug images packSizes")
			.lean();
	}

	const [products, collectionsRaw] = await Promise.all([
		productsPromise,
		collectionsPromise,
	]);

	// ── Compute price for every collection ────────────────
	const collectionsWithPrice = (collectionsRaw as any[]).map((c) => {
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
	});

	// ── Sort collections by computedPrice (in memory) ─────
	const collections = (() => {
		if (sort === "price-asc") {
			return [...collectionsWithPrice]
				.sort((a, b) => a.computedPrice - b.computedPrice)
				.slice(0, limit);
		}
		if (sort === "price-desc") {
			return [...collectionsWithPrice]
				.sort((a, b) => b.computedPrice - a.computedPrice)
				.slice(0, limit);
		}
		if (sort === "newest") {
			return [...collectionsWithPrice]
				.sort(
					(a, b) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
				)
				.slice(0, limit);
		}
		// featured
		return [...collectionsWithPrice]
			.sort((a, b) => {
				if (a.isFeatured && !b.isFeatured) return -1;
				if (!a.isFeatured && b.isFeatured) return 1;
				return (
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
			})
			.slice(0, limit);
	})();

	return ok(res, {
		products,
		collections,
		total: products.length + collections.length,
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
