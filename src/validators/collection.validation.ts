import { z } from "zod";

const itemSchema = z.object({
	productId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid productId"),
	qty: z.number().int().min(1).default(1),
});

const pricingSchema = z
	.object({
		type: z.enum(["fixed", "sum-discount"]),
		amount: z.number().nonnegative().optional(),
		discountPct: z.number().min(0).max(100).optional(),
	})
	.refine(
		(v) =>
			v.type === "fixed" ? v.amount !== undefined : v.discountPct !== undefined,
		{
			message:
				"Provide amount for fixed pricing or discountPct for sum-discount",
		},
	);

export const createCollectionSchema = z.object({
	name: z.string().min(2).max(120),
	slug: z.string().min(2).optional(),
	occasion: z.string().min(2).max(80),
	description: z.string().min(10),
	image: z.string().url().optional().or(z.literal("")),
	items: z.array(itemSchema).min(1),
	pricing: pricingSchema,
	status: z.enum(["draft", "published", "archived"]).default("draft"),
	isFeatured: z.boolean().default(false),
});

export const updateCollectionSchema = createCollectionSchema.partial();

export const listCollectionsQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: z.enum(["draft", "published", "archived"]).optional(),
	occasion: z.string().optional(),
	q: z.string().optional(),
	featured: z.coerce.boolean().optional(),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
