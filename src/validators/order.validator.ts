import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

const addressSchema = z.object({
	label: z.string().max(40).optional(),
	fullName: z.string().min(1).max(80),
	phone: z.string().min(7).max(20),
	street: z.string().min(1).max(200),
	city: z.string().min(1).max(80),
	state: z.string().min(1).max(80),
	country: z.string().min(1).max(80).default("Nigeria"),
	postalCode: z.string().max(20).optional(),
});

const cartItemSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("product"),
		refId: objectId,
		qty: z.number().int().min(1),
		packSize: z.string().min(1),
	}),
	z.object({
		kind: z.literal("collection"),
		refId: objectId,
		qty: z.number().int().min(1),
	}),
	z.object({
		kind: z.literal("mix"),
		mixId: objectId,
		qty: z.number().int().min(1),
	}),
]);

export const checkoutInitSchema = z.object({
	email: z.string().email().toLowerCase(),
	items: z.array(cartItemSchema).min(1),
	shippingAddress: addressSchema,
	shippingFee: z.number().nonnegative().default(0),
	note: z.string().max(500).optional(),
});

export const listOrdersQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: z
		.enum([
			"pending",
			"paid",
			"processing",
			"shipped",
			"delivered",
			"cancelled",
			"refunded",
		])
		.optional(),
	q: z.string().optional(),
	from: z.string().optional(),
	to: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
	status: z.enum([
		"pending",
		"paid",
		"processing",
		"shipped",
		"delivered",
		"cancelled",
		"refunded",
	]),
	note: z.string().max(300).optional(),
});

export const updateFulfilmentSchema = z.object({
	courier: z.string().max(80).optional(),
	trackingNo: z.string().max(80).optional(),
	notes: z.string().max(500).optional(),
});

export type CheckoutInitInput = z.infer<typeof checkoutInitSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
