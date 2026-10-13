import { FilterQuery, Types } from "mongoose";
import { Category, ICategory } from "../models/Category";
import { Product } from "../models/Product";
import { AppError } from "../utils/AppError";
import { uniqueSlug } from "../utils/slugify";
import {
	CreateCategoryInput,
	UpdateCategoryInput,
} from "../validators/category.validator";

export async function createCategory(
	input: CreateCategoryInput,
): Promise<ICategory> {
	const slug = input.slug
		? await uniqueSlug(Category, input.slug)
		: await uniqueSlug(Category, input.name);

	const category = await Category.create({
		...input,
		slug,
		parentId: input.parentId ?? null,
	});
	return category;
}

export async function updateCategory(
	id: string,
	input: UpdateCategoryInput,
): Promise<ICategory> {
	const category = await Category.findById(id);
	if (!category) throw AppError.notFound("Category not found");

	if (input.slug && input.slug !== category.slug) {
		category.slug = await uniqueSlug(Category, input.slug, id);
	}
	if (input.name && input.name !== category.name && !input.slug) {
		category.slug = await uniqueSlug(Category, input.name, id);
	}
	if (input.parentId === id) {
		throw AppError.badRequest("A category cannot be its own parent");
	}

	Object.assign(category, input);
	await category.save();
	return category;
}

export async function deleteCategory(id: string): Promise<void> {
	const category = await Category.findById(id);
	if (!category) throw AppError.notFound("Category not found");

	// Prevent orphaning: refuse if any products still reference this category
	const inUse = await Product.countDocuments({
		categoryId: new Types.ObjectId(id),
	});
	if (inUse > 0) {
		throw AppError.conflict(
			`${inUse} product(s) still use this category. Reassign them first.`,
		);
	}

	// Detach children
	await Category.updateMany(
		{ parentId: new Types.ObjectId(id) },
		{ $set: { parentId: null } },
	);

	await category.deleteOne();
}

export async function listCategories(query: {
	page: number;
	limit: number;
	q?: string;
	isActive?: boolean;
	parentId?: string;
}) {
	const filter: FilterQuery<ICategory> = {};
	if (query.q) filter.name = new RegExp(query.q, "i");
	if (query.isActive !== undefined) filter.isActive = query.isActive;
	if (query.parentId) filter.parentId = new Types.ObjectId(query.parentId);

	const [items, total] = await Promise.all([
		Category.find(filter)
			.sort({ order: 1, name: 1 })
			.skip((query.page - 1) * query.limit)
			.limit(query.limit)
			.lean(),
		Category.countDocuments(filter),
	]);

	// Attach product counts
	const ids = items.map((c) => c._id);
	const counts = await Product.aggregate<{
		_id: Types.ObjectId;
		count: number;
	}>([
		{ $match: { categoryId: { $in: ids } } },
		{ $group: { _id: "$categoryId", count: { $sum: 1 } } },
	]);
	const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

	return {
		items: items.map((c) => ({
			...c,
			productCount: countMap.get(String(c._id)) ?? 0,
		})),
		total,
		page: query.page,
		limit: query.limit,
		pages: Math.ceil(total / query.limit),
	};
}

export async function getCategoryById(id: string) {
	const category = await Category.findById(id).lean();
	if (!category) throw AppError.notFound("Category not found");
	return category;
}

export async function listPublicCategories() {
	return Category.find({ isActive: true })
		.sort({ order: 1, name: 1 })
		.select("_id name slug description image")
		.lean();
}
