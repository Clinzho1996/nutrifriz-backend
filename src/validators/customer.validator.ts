import { z } from "zod";

export const listCustomersQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(500).default(20),
	q: z.string().optional(),
	role: z.enum(["customer", "b2b", "staff", "admin"]).optional(),
	from: z.string().optional(),
	to: z.string().optional(),
});

export const importOptionsSchema = z.object({
	role: z.enum(["customer", "b2b"]).default("customer"),
	updateExisting: z.coerce.boolean().default(false),
	defaultPassword: z.string().min(8).optional(),
});

export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
