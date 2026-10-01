import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

const categories = [
	"Healthy Snacking",
	"Nutrition",
	"Recipes",
	"Freeze-Drying",
	"Food Sustainability",
	"African Agriculture",
	"Food Innovation",
] as const;

export const createJournalPostSchema = z.object({
	title: z.string().min(4).max(160),
	slug: z.string().min(2).optional(),
	excerpt: z.string().min(10).max(300),
	body: z.string().min(50),
	category: z.enum(categories),
	coverImage: z.string().url().optional().or(z.literal("")),
	seo: z
		.object({
			title: z.string().max(80).optional(),
			description: z.string().max(200).optional(),
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
	category: z.enum(categories).optional(),
	status: z.enum(["draft", "published", "archived"]).optional(),
	q: z.string().optional(),
});

export type CreateJournalPostInput = z.infer<typeof createJournalPostSchema>;
