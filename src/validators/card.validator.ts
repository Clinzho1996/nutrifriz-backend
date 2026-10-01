import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

export const createSeriesSchema = z.object({
	code: z.string().min(2).max(40),
	name: z.string().min(2).max(120),
	description: z.string().max(500).optional().default(""),
	totalCards: z.number().int().min(1),
	status: z.enum(["draft", "active", "retired"]).default("draft"),
});

export const updateSeriesSchema = createSeriesSchema.partial();

export const issueCardsSchema = z.object({
	count: z.number().int().min(1).max(5000),
	fruits: z.array(z.string().min(1)).min(1),
	factTemplate: z
		.string()
		.default("Freeze-dried {fruit} keeps its crunch and natural flavour."),
	challenge: z.string().max(200).optional(),
});

export const registerCardSchema = z.object({
	cardCode: z.string().min(3).max(40),
});

export const listCardsQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(200).default(50),
	seriesId: objectId.optional(),
	status: z.enum(["issued", "registered", "retired"]).optional(),
	q: z.string().optional(),
});

export type CreateSeriesInput = z.infer<typeof createSeriesSchema>;
export type IssueCardsInput = z.infer<typeof issueCardsSchema>;
