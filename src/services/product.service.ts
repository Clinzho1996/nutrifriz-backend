import { FilterQuery } from "mongoose";
import { Product, IProduct } from "../models/Product";
import { Review } from "../models/Review";
import { AppError } from "../utils/AppError";
import { uniqueSlug } from "../utils/slugify";
import {
	CreateProductInput,
	ListProductsQuery,
	UpdateProductInput,
} from "../validators/product.validator";

export async function createProduct(
	input: CreateProductInput,
): Promise<IProduct> {
	const slug = input.slug
		? await uniqueSlug(Product, input.slug)
		: await uniqueSlug(Product, input.name);

	const product = await Product.create({ ...input, slug });
	return product;
}

export async function updateProduct(
	id: string,
	input: UpdateProductInput,
): Promise<IProduct> {
	const product = await Product.findById(id);
	if (!product) throw AppError.notFound("Product not found");

	if (input.slug && input.slug !== product.slug) {
		product.slug = await uniqueSlug(Product, input.slug, id);
	}
	if (input.name && input.name !== product.name && !input.slug) {
		product.slug = await uniqueSlug(Product, input.name, id);
	}

	Object.assign(product, input);
	await product.save();
	return product;
}

export async function deleteProduct(id: string): Promise<void> {
	const product = await Product.findById(id);
	if (!product) throw AppError.notFound("Product not found");
	product.status = "archived";
	await product.save();
}

export async function listProducts(query: ListProductsQuery) {
	const filter: FilterQuery<IProduct> = {};
	if (query.category) filter.category = query.category;
	if (query.fruit) filter.fruit = query.fruit;
	if (query.status) filter.status = query.status;
	if (query.featured !== undefined) filter.isFeatured = query.featured;
	if (query.mixEligible !== undefined)
		filter.isBuildYourMixEligible = query.mixEligible;

	if (query.q) {
		filter.$or = [
			{ name: new RegExp(query.q, "i") },
			{ shortDescription: new RegExp(query.q, "i") },
			{ tags: new RegExp(query.q, "i") },
		];
	}

	const sort = parseSort(query.sort) ?? { createdAt: -1 };

	const [items, total] = await Promise.all([
		Product.find(filter)
			.sort(sort)
			.skip((query.page - 1) * query.limit)
			.limit(query.limit)
			.lean(),
		Product.countDocuments(filter),
	]);

	return {
		items,
		total,
		page: query.page,
		limit: query.limit,
		pages: Math.ceil(total / query.limit),
	};
}

export async function getProductBySlug(slug: string, publicOnly = true) {
	const filter: FilterQuery<IProduct> = { slug };
	if (publicOnly) filter.status = "published";

	const product = await Product.findOne(filter).lean();
	if (!product) throw AppError.notFound("Product not found");
	return product;
}

export async function getProductById(id: string) {
	const product = await Product.findById(id).lean();
	if (!product) throw AppError.notFound("Product not found");
	return product;
}

export async function recalcProductRating(productId: string): Promise<void> {
	const stats = await Review.aggregate<{ avg: number; count: number }>([
		{
			$match: {
				productId: new (require("mongoose").Types.ObjectId)(productId),
				status: "approved",
			},
		},
		{
			$group: {
				_id: "$productId",
				avg: { $avg: "$rating" },
				count: { $sum: 1 },
			},
		},
	]);

	const avg = stats[0]?.avg ?? 0;
	const count = stats[0]?.count ?? 0;

	await Product.findByIdAndUpdate(productId, {
		ratingAvg: Math.round(avg * 10) / 10,
		ratingCount: count,
	});
}

function parseSort(sort?: string): Record<string, 1 | -1> | null {
	if (!sort) return null;
	const [field, dir] = sort.split(":");
	if (!field) return null;
	const direction = dir === "asc" ? 1 : -1;
	return { [field]: direction } as Record<string, 1 | -1>;
}
