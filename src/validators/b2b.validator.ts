import { z } from "zod";

const businessTypes = [
	"retailer",
	"wholesale",
	"restaurant",
	"chef",
	"hotel",
	"manufacturer",
	"corporate-gifting",
	"ingredient",
	"partnership",
	"other",
] as const;

export const createB2BLeadSchema = z.object({
	company: z.string().min(2).max(160),
	businessType: z.enum(businessTypes),
	contactName: z.string().min(2).max(120),
	email: z.string().email().toLowerCase(),
	phone: z.string().min(7).max(20),
	location: z.string().min(2).max(120),
	interest: z.string().min(3).max(200),
	estimatedQuantity: z.string().max(80).optional(),
	message: z.string().max(2000).optional(),
});

export const updateB2BLeadSchema = z.object({
	status: z.enum(["new", "contacted", "qualified", "won", "lost"]).optional(),
	assignedTo: z
		.string()
		.regex(/^[a-fA-F0-9]{24}$/)
		.optional(),
});

export const addB2BNoteSchema = z.object({
	body: z.string().min(1).max(1000),
});

export const listB2BQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: z.enum(["new", "contacted", "qualified", "won", "lost"]).optional(),
	businessType: z.enum(businessTypes).optional(),
	q: z.string().optional(),
});

export type CreateB2BLeadInput = z.infer<typeof createB2BLeadSchema>;
