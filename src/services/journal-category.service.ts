import { FilterQuery } from "mongoose";
import { IJournalCategory, JournalCategory } from "../models/JournalCategory";
import { JournalPost } from "../models/JournalPost";
import { AppError } from "../utils/AppError";
import { uniqueSlug } from "../utils/slugify";
import { CreateJournalCategoryInput } from "../validators/journal-category.validator";
import { recordAudit } from "./audit.service";

export async function listCategories(query: {
	page: number;
	limit: number;
	q?: string;
	isActive?: boolean;
}) {
	const filter: FilterQuery<IJournalCategory> = {};
	if (query.q) filter.name = new RegExp(query.q, "i");
	if (query.isActive !== undefined) filter.isActive = query.isActive;

	const [items, total] = await Promise.all([
		JournalCategory.find(filter)
			.sort({ order: 1, name: 1 })
			.skip((query.page - 1) * query.limit)
			.limit(query.limit)
			.lean(),
		JournalCategory.countDocuments(filter),
	]);

	// Attach post counts so the admin sees usage
	const slugs = items.map((c) => c.slug);
	const counts = await JournalPost.aggregate<{ _id: string; count: number }>([
		{ $match: { category: { $in: slugs } } },
		{ $group: { _id: "$category", count: { $sum: 1 } } },
	]);
	const countMap = new Map(counts.map((c) => [c._id, c.count]));

	return {
		items: items.map((c) => ({ ...c, postCount: countMap.get(c.slug) ?? 0 })),
		total,
		page: query.page,
		limit: query.limit,
		pages: Math.ceil(total / query.limit),
	};
}

export async function listPublicCategories() {
	return JournalCategory.find({ isActive: true })
		.sort({ order: 1, name: 1 })
		.select("_id name slug description")
		.lean();
}

export async function getCategoryById(id: string) {
	const category = await JournalCategory.findById(id).lean();
	if (!category) throw AppError.notFound("Category not found");
	return category;
}

export async function createCategory(
	input: CreateJournalCategoryInput,
	actorId?: string,
): Promise<IJournalCategory> {
	const slug = input.slug
		? await uniqueSlug(JournalCategory, input.slug)
		: await uniqueSlug(JournalCategory, input.name);

	const category = await JournalCategory.create({ ...input, slug });

	await recordAudit({
		actorId,
		action: "journal-category.create",
		entity: "JournalCategory",
		entityId: String(category._id),
		after: category.toObject(),
	});

	return category;
}

export async function updateCategory(
	id: string,
	input: Partial<CreateJournalCategoryInput>,
	actorId?: string,
): Promise<IJournalCategory> {
	const category = await JournalCategory.findById(id);
	if (!category) throw AppError.notFound("Category not found");

	if (input.slug && input.slug !== category.slug) {
		category.slug = await uniqueSlug(JournalCategory, input.slug, id);
	}
	if (input.name && input.name !== category.name && !input.slug) {
		category.slug = await uniqueSlug(JournalCategory, input.name, id);
	}

	Object.assign(category, input);
	await category.save();

	await recordAudit({
		actorId,
		action: "journal-category.update",
		entity: "JournalCategory",
		entityId: String(category._id),
		after: category.toObject(),
	});

	return category;
}

export async function deleteCategory(
	id: string,
	actorId?: string,
): Promise<void> {
	const category = await JournalCategory.findById(id);
	if (!category) throw AppError.notFound("Category not found");

	const inUse = await JournalPost.countDocuments({ category: category.slug });
	if (inUse > 0) {
		throw AppError.conflict(
			`${inUse} post(s) still use this category. Reassign them first.`,
		);
	}

	await category.deleteOne();

	await recordAudit({
		actorId,
		action: "journal-category.delete",
		entity: "JournalCategory",
		entityId: id,
	});
}

/**
 * Ensure a category exists by slug, creating it if needed.
 * Used when importing posts or seeding.
 */
export async function ensureCategory(slug: string, name?: string) {
	const existing = await JournalCategory.findOne({ slug });
	if (existing) return existing;
	return JournalCategory.create({
		slug,
		name: name ?? titleCase(slug),
		description: "",
		order: 0,
		isActive: true,
	});
}

function titleCase(s: string): string {
	return s
		.split(/[-\s]+/)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}
