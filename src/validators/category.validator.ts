import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

export const createCategorySchema = z.object({
	name: z.string().min(2).max(80),
	slug: z.string().min(2).max(80).optional(),
	description: z.string().max(500).optional().default(""),
	image: z.string().optional().default(""),
	parentId: objectId.optional().nullable(),
	order: z.coerce.number().int().default(0),
	isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const listCategoriesQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
	q: z.string().optional(),
	isActive: z.coerce.boolean().optional(),
	parentId: z.string().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
