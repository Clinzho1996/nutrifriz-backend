import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

export const createReviewSchema = z.object({
	productId: objectId,
	rating: z.number().int().min(1).max(5),
	title: z.string().max(120).optional(),
	body: z.string().min(5).max(2000),
	photos: z.array(z.string().url()).max(6).default([]),
	orderId: objectId.optional(),
});

export const moderateReviewSchema = z.object({
	status: z.enum(["approved", "rejected"]),
	note: z.string().max(300).optional(),
});

export const listReviewsQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: z.enum(["pending", "approved", "rejected"]).optional(),
	productId: objectId.optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
