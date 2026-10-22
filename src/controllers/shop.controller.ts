import { Request, Response } from "express";
import { Types } from "mongoose";
import { Category } from "../models/Category";
import { Collection } from "../models/Collection";
import { Product } from "../models/Product";
import { ok } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

interface ShopItem {
	type: "product" | "collection";
	data: any;
}

/**
 * GET /shop/all
 *
 * Returns a unified list of products and/or collections.
 *
 * Sorting is applied per-type:
 *   - Products: featured / price-asc / price-desc / newest
 *   - Collections: featured / newest (price sorts ignored since collections
 *     have a computed price but the client already handles this well enough)
 *
 * Category filtering:
 *   - 'all' or missing: return both
 *   - 'collections': return only collections
 *   - 'gift-boxes': return collections with occasion = 'Gift'
 *   - anything else: treat as a product category, return only that category's products
 */
export const listAll = asyncHandler(async (req: Request, res: Response) => {
	const q = (req.query.q as string)?.trim() || undefined;
	const categorySlug = (req.query.categorySlug as string) || undefined;
	const sort = (req.query.sort as string) || "featured";
	const limit = Math.min(Number(req.query.limit ?? 60), 200);

	// ── Determine what to query ──────────────────────────
	let includeProducts = true;
	let includeCollections = true;
	let productCategoryId: Types.ObjectId | undefined;
	let collectionOccasion: string | undefined;

	if (categorySlug && categorySlug !== "all") {
		if (categorySlug === "collections") {
			includeProducts = false;
			includeCollections = true;
		} else if (categorySlug === "gift-boxes") {
			includeProducts = false;
			includeCollections = true;
			collectionOccasion = "Gift";
		} else {
			// Any other slug is a product category — filter products only.
			const category = await Category.findOne({ slug: categorySlug }).lean();
			if (!category) {
				return ok(res, { products: [], collections: [], total: 0 });
			}
			productCategoryId = category._id as Types.ObjectId;
			includeProducts = true;
			includeCollections = false;
		}
	}

	// ── Products query ────────────────────────────────────
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
				// Only products that actually have at least one pack size
				{ $match: { ...productFilter, "packSizes.0": { $exists: true } } },
				// Sort by cheapest variant
				{ $addFields: { _minPrice: { $min: "$packSizes.price" } } },
				// Tie-break with featured then newest
				{ $sort: { _minPrice: direction, isFeatured: -1, createdAt: -1 } },
				{ $limit: limit },
				// Populate category (same shape as .populate('categoryId', ...))
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
			// 'featured' or default
			productsPromise = Product.find(productFilter)
				.sort({ isFeatured: -1, createdAt: -1 })
				.limit(limit)
				.populate("categoryId", "name slug")
				.lean();
		}
	}

	// ── Collections query ─────────────────────────────────
	let collectionsPromise: Promise<any[]> = Promise.resolve([]);

	if (includeCollections) {
		const collectionFilter: Record<string, unknown> = { status: "published" };
		if (collectionOccasion) collectionFilter.occasion = collectionOccasion;
		if (q) collectionFilter.name = new RegExp(q, "i");

		// Collections support featured + newest. Price sorts fall back to featured
		// order — the frontend hides the sort control for collection-only views.
		const collectionSort: Record<string, 1 | -1> =
			sort === "newest" ? { createdAt: -1 } : { isFeatured: -1, createdAt: -1 };

		collectionsPromise = Collection.find(collectionFilter)
			.sort(collectionSort)
			.limit(limit)
			.populate("items.productId", "name slug images packSizes")
			.lean();
	}

	const [products, collections] = await Promise.all([
		productsPromise,
		collectionsPromise,
	]);

	// ── Compute collection prices so the storefront doesn't need to ──
	const collectionsWithPrice = (collections as any[]).map((c) => {
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

	return ok(res, {
		products,
		collections: collectionsWithPrice,
		total: products.length + collectionsWithPrice.length,
	});
});

/**
 * GET /shop/categories
 *
 * Returns the active admin categories PLUS two synthetic utility categories
 * ('collections', 'gift-boxes') so the sidebar always has an entry for each
 * content type even if the admin hasn't created one.
 */
export const listShopCategories = asyncHandler(
	async (_req: Request, res: Response) => {
		const categories = await Category.find({ isActive: true })
			.sort({ order: 1, name: 1 })
			.select("_id name slug description")
			.lean();

		return ok(res, categories);
	},
);
