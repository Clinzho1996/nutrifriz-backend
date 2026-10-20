import { Request, Response } from "express";
import { Category } from "../models/Category";
import { Collection } from "../models/Collection";
import { Product } from "../models/Product";
import { ok } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * GET /shop/all
 * Returns both published products and published collections,
 * plus the active categories for the filter rail.
 *
 * Query params:
 *  - q: search term (matches product name / collection name)
 *  - categorySlug: filter products by categoryId and collections by occasion
 *  - sort: 'price-asc' | 'price-desc' | 'newest' | 'featured' (products only)
 *  - limit: 60 by default
 */
export const listAll = asyncHandler(async (req: Request, res: Response) => {
	const q = (req.query.q as string) || undefined;
	const categorySlug = (req.query.categorySlug as string) || undefined;
	const sort = (req.query.sort as string) || undefined;
	const limit = Math.min(Number(req.query.limit ?? 60), 200);

	// Resolve categorySlug to a categoryId (if provided and it's a real category)
	let categoryId: any = undefined;
	let collectionOccasion: string | undefined = undefined;

	if (categorySlug && categorySlug !== "all") {
		const category = await Category.findOne({ slug: categorySlug }).lean();
		if (category) {
			categoryId = category._id;
			// If the category is explicitly "collections" or "gift-boxes", prefer collection results
			if (category.slug === "collections") collectionOccasion = undefined;
			if (category.slug === "gift-boxes") collectionOccasion = "Gift";
		}
	}

	// Build product filter
	const productFilter: Record<string, unknown> = { status: "published" };
	if (categoryId) productFilter.categoryId = categoryId;
	if (q)
		productFilter.$or = [
			{ name: new RegExp(q, "i") },
			{ shortDescription: new RegExp(q, "i") },
			{ tags: new RegExp(q, "i") },
		];

	// Build collection filter
	const collectionFilter: Record<string, unknown> = { status: "published" };
	if (collectionOccasion) collectionFilter.occasion = collectionOccasion;
	if (q) collectionFilter.name = new RegExp(q, "i");

	// Sort mapping
	const productSort: Record<string, 1 | -1> =
		sort === "price-asc"
			? { "packSizes.0.price": 1 }
			: sort === "price-desc"
				? { "packSizes.0.price": -1 }
				: sort === "newest"
					? { createdAt: -1 }
					: { isFeatured: -1, createdAt: -1 };

	const [products, collections] = await Promise.all([
		Product.find(productFilter)
			.sort(productSort)
			.limit(limit)
			.populate("categoryId", "name slug")
			.lean(),
		Collection.find(collectionFilter)
			.sort({ isFeatured: -1, createdAt: -1 })
			.limit(limit)
			.populate("items.productId", "name slug images packSizes")
			.lean(),
	]);

	// Compute collection prices so the storefront doesn't recalculate
	const collectionsWithPrice = await Promise.all(
		collections.map(async (c: any) => {
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

/** GET /shop/categories — active categories for the filter rail */
export const listShopCategories = asyncHandler(
	async (_req: Request, res: Response) => {
		const categories = await Category.find({ isActive: true })
			.sort({ order: 1, name: 1 })
			.select("_id name slug description")
			.lean();
		return ok(res, categories);
	},
);
