import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

export const priceMixSchema = z.object({
	packSize: z.string().min(1),
	fruits: z
		.array(
			z.object({
				productId: objectId,
				grams: z.number().int().positive(),
			}),
		)
		.min(1),
});

export const saveMixSchema = priceMixSchema.extend({
	name: z.string().max(60).optional(),
});

export const mixRuleSchema = z.object({
	packSize: z.string().min(1),
	minFruits: z.number().int().min(1),
	maxFruits: z.number().int().min(1),
	minGramsPerFruit: z.number().int().min(1),
	pricePerGram: z.number().nonnegative(),
	totalGrams: z.number().int().positive(),
	allowedFruitIds: z.array(objectId).min(1),
	isActive: z.boolean().default(true),
});

export const updateMixRuleSchema = mixRuleSchema.partial();

export type PriceMixInput = z.infer<typeof priceMixSchema>;
export type SaveMixInput = z.infer<typeof saveMixSchema>;
export type MixRuleInput = z.infer<typeof mixRuleSchema>;
