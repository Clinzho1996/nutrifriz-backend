import { z } from "zod";

export const createJournalCategorySchema = z.object({
	name: z.string().min(2).max(80),
	slug: z
		.string()
		.min(2)
		.max(80)
		.optional()
		.or(z.literal("").transform(() => undefined)),
	description: z
		.string()
		.max(300)
		.optional()
		.or(z.literal("").transform(() => undefined)),
	order: z.coerce.number().int().default(0),
	isActive: z.boolean().default(true),
});

export const updateJournalCategorySchema =
	createJournalCategorySchema.partial();

export const listJournalCategoriesQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(500).default(50),
	q: z.string().optional(),
	isActive: z.coerce.boolean().optional(),
});

export type CreateJournalCategoryInput = z.infer<
	typeof createJournalCategorySchema
>;
