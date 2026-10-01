import { z } from "zod";

const packSizeSchema = z.object({
	size: z.string().min(1),
	price: z.number().nonnegative(),
	sku: z.string().min(1),
	stock: z.number().int().nonnegative().default(0),
});

const nutritionSchema = z.object({
	calories: z.number().nonnegative().default(0),
	protein: z.number().nonnegative().default(0),
	carbs: z.number().nonnegative().default(0),
	sugar: z.number().nonnegative().default(0),
	fibre: z.number().nonnegative().default(0),
	fat: z.number().nonnegative().default(0),
});

export const createProductSchema = z.object({
	name: z.string().min(2).max(120),
	slug: z.string().min(2).optional(),
	category: z.enum(["fruit", "mix", "collection", "gift"]),
	fruit: z.string().max(60).optional(),
	shortDescription: z.string().min(5).max(240),
	description: z.string().min(10),
	images: z.array(z.string().url()).default([]),
	packSizes: z.array(packSizeSchema).min(1),
	ingredients: z.array(z.string()).default([]),
	nutrition: nutritionSchema.optional(),
	storage: z.string().optional(),
	shelfLife: z.string().optional(),
	shippingInfo: z.string().optional(),
	status: z.enum(["draft", "published", "archived"]).default("draft"),
	isBuildYourMixEligible: z.boolean().default(false),
	isFeatured: z.boolean().default(false),
	tags: z.array(z.string()).default([]),
});

export const updateProductSchema = createProductSchema.partial();

export const listProductsQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	category: z.enum(["fruit", "mix", "collection", "gift"]).optional(),
	fruit: z.string().optional(),
	status: z.enum(["draft", "published", "archived"]).optional(),
	q: z.string().optional(),
	sort: z.string().optional(),
	featured: z.coerce.boolean().optional(),
	mixEligible: z.coerce.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
