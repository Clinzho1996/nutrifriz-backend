import { FilterQuery } from "mongoose";
import { Collection, ICollection } from "../models/Collection";
import { Product } from "../models/Product";
import { AppError } from "../utils/AppError";
import { uniqueSlug } from "../utils/slugify";
import { CreateCollectionInput } from "../validators/collection.validator";

export async function createCollection(
	input: CreateCollectionInput,
): Promise<ICollection> {
	const slug = input.slug
		? await uniqueSlug(Collection, input.slug)
		: await uniqueSlug(Collection, input.name);

	return Collection.create({ ...input, slug });
}

export async function updateCollection(
	id: string,
	input: Partial<CreateCollectionInput>,
): Promise<ICollection> {
	const collection = await Collection.findById(id);
	if (!collection) throw AppError.notFound("Collection not found");

	if (input.slug && input.slug !== collection.slug) {
		collection.slug = await uniqueSlug(Collection, input.slug, id);
	}
	Object.assign(collection, input);
	await collection.save();
	return collection;
}

export async function deleteCollection(id: string): Promise<void> {
	const collection = await Collection.findById(id);
	if (!collection) throw AppError.notFound("Collection not found");
	collection.status = "archived";
	await collection.save();
}

const POPULATE_FIELDS =
	"name slug images packSizes sku status isFeatured category";

function sanitizeItems(collection: any) {
	if (!collection?.items) return collection;
	const validItems = collection.items.filter(
		(item: any) => item.productId && typeof item.productId === "object",
	);
	const orphanedCount = collection.items.length - validItems.length;
	return {
		...collection,
		items: validItems,
		orphanedItemCount: orphanedCount,
	};
}

export async function listCollections(query: {
	page: number;
	limit: number;
	status?: string;
	occasion?: string;
	q?: string;
	featured?: boolean;
}) {
	const filter: FilterQuery<ICollection> = {};
	if (query.status) filter.status = query.status;
	if (query.occasion) filter.occasion = query.occasion;
	if (query.featured !== undefined) filter.isFeatured = query.featured;
	if (query.q) filter.name = new RegExp(query.q, "i");

	const [items, total] = await Promise.all([
		Collection.find(filter)
			.sort({ createdAt: -1 })
			.skip((query.page - 1) * query.limit)
			.limit(query.limit)
			.populate("items.productId", POPULATE_FIELDS)
			.lean(),
		Collection.countDocuments(filter),
	]);

	return {
		items: items.map(sanitizeItems),
		total,
		page: query.page,
		limit: query.limit,
		pages: Math.ceil(total / query.limit),
	};
}

export async function getCollectionBySlug(slug: string, publicOnly = true) {
	const filter: FilterQuery<ICollection> = { slug };
	if (publicOnly) filter.status = "published";

	const collection = await Collection.findOne(filter)
		.populate("items.productId", POPULATE_FIELDS)
		.lean();
	if (!collection) throw AppError.notFound("Collection not found");
	return sanitizeItems(collection);
}

export async function getCollectionById(id: string) {
	const collection = await Collection.findById(id)
		.populate("items.productId", POPULATE_FIELDS)
		.lean();
	if (!collection) throw AppError.notFound("Collection not found");
	return sanitizeItems(collection);
}

export async function computeCollectionPrice(
	collection: ICollection,
): Promise<number> {
	if (collection.pricing.type === "fixed") {
		return collection.pricing.amount ?? 0;
	}

	const products = await Product.find({
		_id: { $in: collection.items.map((i) => i.productId) },
	}).lean();

	const productMap = new Map(products.map((p) => [String(p._id), p]));
	let total = 0;

	for (const item of collection.items) {
		const product = productMap.get(String(item.productId));
		if (!product) continue;
		const firstPack = product.packSizes[0];
		if (!firstPack) continue;
		total += firstPack.price * item.qty;
	}

	const discountPct = collection.pricing.discountPct ?? 0;
	return Math.round(total * (1 - discountPct / 100));
}
