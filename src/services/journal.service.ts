import { FilterQuery } from "mongoose";
import { JournalPost, IJournalPost } from "../models/JournalPost";
import { AppError } from "../utils/AppError";
import { uniqueSlug } from "../utils/slugify";
import { CreateJournalPostInput } from "../validators/journal.validator";

export async function createPost(
	input: CreateJournalPostInput,
	authorId?: string,
): Promise<IJournalPost> {
	const slug = input.slug
		? await uniqueSlug(JournalPost, input.slug)
		: await uniqueSlug(JournalPost, input.title);

	const post = await JournalPost.create({
		...input,
		slug,
		authorId,
		publishedAt: input.status === "published" ? new Date() : undefined,
	});
	return post;
}

export async function updatePost(
	id: string,
	input: Partial<CreateJournalPostInput>,
): Promise<IJournalPost> {
	const post = await JournalPost.findById(id);
	if (!post) throw AppError.notFound("Post not found");

	if (input.slug && input.slug !== post.slug) {
		post.slug = await uniqueSlug(JournalPost, input.slug, id);
	}
	if (input.status === "published" && post.status !== "published") {
		post.publishedAt = new Date();
	}
	Object.assign(post, input);
	await post.save();
	return post;
}

export async function deletePost(id: string): Promise<void> {
	const post = await JournalPost.findById(id);
	if (!post) throw AppError.notFound("Post not found");
	post.status = "archived";
	await post.save();
}

export async function listPosts(query: {
	page: number;
	limit: number;
	category?: string;
	status?: "draft" | "published" | "archived";
	q?: string;
}) {
	const filter: FilterQuery<IJournalPost> = {};
	if (query.category) filter.category = query.category;
	if (query.status) filter.status = query.status;
	if (query.q)
		filter.$or = [
			{ title: new RegExp(query.q, "i") },
			{ excerpt: new RegExp(query.q, "i") },
			{ tags: new RegExp(query.q, "i") },
		];

	const [items, total] = await Promise.all([
		JournalPost.find(filter)
			.sort({ publishedAt: -1, createdAt: -1 })
			.skip((query.page - 1) * query.limit)
			.limit(query.limit)
			.select("-body")
			.lean(),
		JournalPost.countDocuments(filter),
	]);

	return {
		items,
		total,
		page: query.page,
		limit: query.limit,
		pages: Math.ceil(total / query.limit),
	};
}

export async function getPostBySlug(slug: string, publicOnly = true) {
	const filter: FilterQuery<IJournalPost> = { slug };
	if (publicOnly) filter.status = "published";

	const post = await JournalPost.findOne(filter)
		.populate("relatedProductIds", "name slug images packSizes")
		.lean();
	if (!post) throw AppError.notFound("Post not found");
	return post;
}
