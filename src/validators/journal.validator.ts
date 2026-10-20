import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

export const createJournalPostSchema = z.object({
	title: z.string().min(4).max(160),
	slug: z
		.string()
		.min(2)
		.optional()
		.or(z.literal("").transform(() => undefined)),
	excerpt: z.string().min(10).max(300),
	body: z.string().min(50),
	category: z.string().min(2).max(80), // ← was enum
	coverImage: z
		.string()
		.optional()
		.or(z.literal("").transform(() => undefined)),
	seo: z
		.object({
			title: z
				.string()
				.max(80)
				.optional()
				.or(z.literal("").transform(() => undefined)),
			description: z
				.string()
				.max(200)
				.optional()
				.or(z.literal("").transform(() => undefined)),
		})
		.optional(),
	relatedProductIds: z.array(objectId).default([]),
	tags: z.array(z.string()).default([]),
	status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export const updateJournalPostSchema = createJournalPostSchema.partial();

export const listJournalQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	category: z.string().min(2).max(80).optional(),
	status: z.enum(["draft", "published", "archived"]).optional(),
	q: z.string().optional(),
});

export type CreateJournalPostInput = z.infer<typeof createJournalPostSchema>;
