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
	items: z.array(cartItemSchema).min(1),
	shippingAddress: addressSchema,
	shippingFee: z.number().nonnegative().default(0),
	note: z.string().max(500).optional(),
	paymentMethod: z.enum(["paystack", "bank_transfer"]), // NEW
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

const manualAddressSchema = z.object({
	fullName: z.string().min(1).max(80),
	phone: z.string().min(7).max(20),
	street: z.string().min(1).max(200),
	city: z.string().min(1).max(80),
	state: z.string().min(1).max(80),
	country: z.string().min(1).max(80).default("Nigeria"),
	postalCode: z.string().max(20).optional(),
	label: z.string().max(40).optional(),
});

const manualItemSchema = z.discriminatedUnion("kind", [
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

export const createManualOrderSchema = z.object({
	// Customer — either userId OR (guestEmail + shippingAddress)
	userId: objectId.optional(),
	guestEmail: z.string().email().toLowerCase().optional(),

	// Items — reuse the same discriminated union as checkout
	items: z.array(manualItemSchema).min(1),

	shippingAddress: manualAddressSchema,
	shippingFee: z.number().nonnegative().default(0),

	// Payment
	paymentMethod: z.enum(["cash", "transfer", "pos", "paystack", "other"]),
	paymentStatus: z.enum(["init", "success", "failed"]).default("success"),
	paymentNote: z.string().max(200).optional(),

	// Fulfilment
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
		.default("paid"),

	note: z.string().max(500).optional(),
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

export type CreateManualOrderInput = z.infer<typeof createManualOrderSchema>;

export type CheckoutInitInput = z.infer<typeof checkoutInitSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
