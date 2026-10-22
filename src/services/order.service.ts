import { Types } from "mongoose";
import { Collection, ICollection } from "../models/Collection";
import { MixConfig } from "../models/MixConfig";
import { IOrder, IOrderItem, Order } from "../models/Order";
import { Product } from "../models/Product";
import { User } from "../models/User";
import { OrderStatus } from "../types";
import { AppError } from "../utils/AppError";
import { nextOrderNumber } from "../utils/orderNumber";
import {
	CheckoutInitInput,
	CreateManualOrderInput,
	ListOrdersQuery,
} from "../validators/order.validator";
import { recordAudit } from "./audit.service";
import * as emailService from "./email.service";

async function getOrderRecipientEmail(order: IOrder): Promise<string | null> {
	if (order.userId) {
		const user = await User.findById(order.userId).select("email").lean();
		if (user?.email) return user.email;
	}
	if (order.guestEmail) return order.guestEmail;
	return null;
}

interface BuiltCart {
	items: IOrderItem[];
	subtotal: number;
}

export async function buildCartItems(
	input: CheckoutInitInput["items"],
): Promise<BuiltCart> {
	const items: IOrderItem[] = [];
	let subtotal = 0;

	for (const entry of input) {
		if (entry.kind === "product") {
			const product = await Product.findById(entry.refId).lean();
			if (!product)
				throw AppError.badRequest(`Product ${entry.refId} not found`);
			if (product.status !== "published")
				throw AppError.badRequest(`${product.name} is unavailable`);

			const pack = product.packSizes.find((p) => p.size === entry.packSize);
			if (!pack)
				throw AppError.badRequest(
					`Pack size ${entry.packSize} unavailable for ${product.name}`,
				);
			if (pack.stock < entry.qty)
				throw AppError.badRequest(`Insufficient stock for ${product.name}`);

			const lineTotal = pack.price * entry.qty;
			subtotal += lineTotal;
			items.push({
				kind: "product",
				refId: product._id,
				name: `${product.name} (${pack.size})`,
				unitPrice: pack.price,
				qty: entry.qty,
				meta: { sku: pack.sku, packSize: pack.size },
			});
		}

		if (entry.kind === "collection") {
			const collection = (await Collection.findById(
				entry.refId,
			).lean()) as ICollection | null;
			if (!collection)
				throw AppError.badRequest(`Collection ${entry.refId} not found`);
			if (collection.status !== "published")
				throw AppError.badRequest(`${collection.name} is unavailable`);

			const price = await computeCollectionPriceFor(collection);
			subtotal += price * entry.qty;
			items.push({
				kind: "collection",
				refId: collection._id,
				name: collection.name,
				unitPrice: price,
				qty: entry.qty,
				meta: { occasion: collection.occasion },
			});
		}

		if (entry.kind === "mix") {
			const mix = await MixConfig.findById(entry.mixId).lean();
			if (!mix) throw AppError.badRequest(`Mix ${entry.mixId} not found`);
			if (mix.status === "ordered")
				throw AppError.badRequest("This mix has already been ordered");

			subtotal += mix.computedPrice * entry.qty;
			items.push({
				kind: "mix",
				refId: mix._id,
				name: mix.name ? `Custom Mix — ${mix.name}` : "Custom Mix",
				unitPrice: mix.computedPrice,
				qty: entry.qty,
				meta: { packSize: mix.packSize, fruits: mix.fruits },
			});
		}
	}

	return { items, subtotal };
}

async function computeCollectionPriceFor(
	collection: ICollection,
): Promise<number> {
	if (collection.pricing.type === "fixed")
		return collection.pricing.amount ?? 0;
	const products = await Product.find({
		_id: { $in: collection.items.map((i) => i.productId) },
	}).lean();
	const map = new Map(products.map((p) => [String(p._id), p]));
	let total = 0;
	for (const item of collection.items) {
		const product = map.get(String(item.productId));
		if (!product) continue;
		const firstPack = product.packSizes[0];
		if (!firstPack) continue;
		total += firstPack.price * item.qty;
	}
	const discount = collection.pricing.discountPct ?? 0;
	return Math.round(total * (1 - discount / 100));
}

import { initializeTransaction } from "./paystack.service";

export async function createPendingOrder(
	userId: string,
	userEmail: string,
	input: CheckoutInitInput,
): Promise<{ order: IOrder; paymentLink?: string }> {
	const { items, subtotal } = await buildCartItems(input.items);
	const shippingFee = input.shippingFee ?? 0;
	const total = subtotal + shippingFee;

	const orderNumber = await nextOrderNumber(Order);

	const isPaystack = input.paymentMethod === "paystack";
	const reference = isPaystack
		? `NFR_PS_${orderNumber}_${Date.now()}`
		: `BANK_${orderNumber}_${Date.now()}`;

	const order = await Order.create({
		orderNumber,
		userId: new Types.ObjectId(userId),
		items,
		subtotal,
		shippingFee,
		total,
		currency: "NGN",
		shippingAddress: input.shippingAddress,
		status: "pending",
		payment: {
			provider: isPaystack ? "paystack" : "transfer_manual",
			method: isPaystack ? "paystack" : "bank_transfer",
			reference,
			status: "init",
		},
		history: [
			{
				status: "pending",
				at: new Date(),
				note: isPaystack
					? "Order created — awaiting Paystack payment"
					: "Order created — awaiting bank transfer",
			},
		],
	});

	let paymentLink: string | undefined;

	if (isPaystack) {
		const init = await initializeTransaction({
			email: userEmail,
			amountNaira: total,
			reference,
			metadata: {
				orderId: String(order._id),
				orderNumber,
				custom_fields: [
					{
						display_name: "Order Number",
						variable_name: "order_number",
						value: orderNumber,
					},
				],
			},
			callbackUrl: `${process.env.STOREFRONT_URL}/checkout/verify`,
		});

		// Store the authorization URL for reference
		order.payment.raw = { authorization_url: init.authorization_url };
		await order.save();

		paymentLink = init.authorization_url;
	}

	await recordAudit({
		actorId: userId,
		action: "order.init",
		entity: "Order",
		entityId: String(order._id),
		after: { orderNumber, total, paymentMethod: input.paymentMethod },
	});

	return { order, paymentLink };
}

export async function markOrderPaid(
	reference: string,
	payload?: Record<string, unknown>,
): Promise<IOrder | null> {
	const order = await Order.findOne({ "payment.reference": reference });
	if (!order) return null;

	// Idempotent — already paid, do nothing
	if (order.payment.status === "success") return order;

	order.payment.status = "success";
	order.payment.paidAt = new Date();
	order.payment.raw = { ...(order.payment.raw ?? {}), ...(payload ?? {}) };
	order.status = "paid";
	order.history.push({
		status: "paid",
		at: new Date(),
		note: "Payment confirmed",
	});
	await order.save();

	// Deduct stock
	for (const item of order.items) {
		if (item.kind === "product") {
			const packSize = (item.meta as any)?.packSize;
			if (!packSize) continue;
			await Product.updateOne(
				{ _id: item.refId, "packSizes.size": packSize },
				{ $inc: { "packSizes.$.stock": -item.qty } },
			);
		}
		if (item.kind === "mix") {
			await MixConfig.findByIdAndUpdate(item.refId, { status: "ordered" });
		}
	}

	// Award crunch points
	if (order.userId) {
		const points = Math.floor(order.total / 1000);
		if (points > 0) {
			await User.findByIdAndUpdate(order.userId, {
				$inc: { crunchPoints: points },
			});
		}
	}

	// Send confirmation email (fire-and-forget)
	const recipient = await getOrderRecipientEmail(order);
	if (recipient) {
		const customerName = order.shippingAddress?.fullName || "there";
		void (async () => {
			try {
				const emailService = await import("./email.service");
				await emailService.sendOrderConfirmationEmail({
					to: recipient,
					orderNumber: order.orderNumber,
					customerName,
					items: order.items.map((i: any) => ({
						name: i.name,
						qty: i.qty,
						unitPrice: i.unitPrice,
					})),
					subtotal: order.subtotal,
					shippingFee: order.shippingFee,
					total: order.total,
					shippingAddress: {
						street: order.shippingAddress.street,
						city: order.shippingAddress.city,
						state: order.shippingAddress.state,
					},
				});
			} catch (err) {
				console.error("[markOrderPaid] email failed", err);
			}
		})();
	}

	await recordAudit({
		action: "order.paid",
		entity: "Order",
		entityId: String(order._id),
		after: { reference, total: order.total },
	});

	return order;
}

/**
 * Create a manual order — bypasses Paystack, deducts stock immediately,
 * and marks the payment however the admin decided.
 */
export async function createManualOrder(
	actorId: string,
	input: CreateManualOrderInput,
): Promise<IOrder> {
	// Build line items + subtotal using the same logic as checkout
	const { items, subtotal } = await buildCartItems(input.items);
	const shippingFee = input.shippingFee ?? 0;
	const total = subtotal + shippingFee;

	// Resolve customer link
	let userId: Types.ObjectId | undefined;
	let guestEmail: string | undefined;

	if (input.userId) {
		userId = new Types.ObjectId(input.userId);
	} else if (input.guestEmail) {
		guestEmail = input.guestEmail;
	} else {
		throw AppError.badRequest("Provide either userId or guestEmail");
	}

	// Generate order number + placeholder reference
	const orderNumber = await nextOrderNumber(Order);
	const reference = `MANUAL_${orderNumber}_${Date.now()}`;

	const now = new Date();
	const isPaid = input.paymentStatus === "success";

	const order = await Order.create({
		orderNumber,
		userId,
		guestEmail,
		items,
		subtotal,
		shippingFee,
		total,
		currency: "NGN",
		shippingAddress: input.shippingAddress,
		status: input.status,
		source: "manual",
		payment: {
			provider: "manual",
			method: input.paymentMethod,
			reference,
			status: input.paymentStatus,
			paidAt: isPaid ? now : undefined,
			raw: input.paymentNote ? { note: input.paymentNote } : undefined,
		},
		fulfilment: {},
		history: [
			{ status: "pending", at: now, by: new Types.ObjectId(actorId) },
			...(input.status !== "pending"
				? [
						{
							status: input.status,
							at: now,
							by: new Types.ObjectId(actorId),
							note: input.note ?? "Manual order created",
						},
					]
				: []),
		],
	});

	// Deduct stock for product lines immediately
	for (const item of order.items) {
		if (item.kind === "product") {
			const packSize = (item.meta as any)?.packSize;
			if (!packSize) continue;
			await Product.updateOne(
				{ _id: item.refId, "packSizes.size": packSize },
				{ $inc: { "packSizes.$.stock": -item.qty } },
			);
		}
		if (item.kind === "mix") {
			await MixConfig.findByIdAndUpdate(item.refId, { status: "ordered" });
		}
	}

	// Award crunch points for known users on paid manual orders
	if (order.userId && isPaid) {
		const points = Math.floor(order.total / 1000);
		if (points > 0) {
			await User.findByIdAndUpdate(order.userId, {
				$inc: { crunchPoints: points },
			});
		}
	}

	await recordAudit({
		actorId,
		action: "order.manual.create",
		entity: "Order",
		entityId: String(order._id),
		after: {
			orderNumber,
			total,
			source: "manual",
			paymentMethod: input.paymentMethod,
		},
	});

	return order;
}
export async function markOrderFailed(
	reference: string,
	payload?: Record<string, unknown>,
) {
	const order = await Order.findOne({ "payment.reference": reference });
	if (!order) return null;
	if (order.payment.status === "success") return order;

	order.payment.status = "failed";
	order.payment.raw = { ...(order.payment.raw ?? {}), ...(payload ?? {}) };
	await order.save();
	return order;
}

export async function getOrderById(id: string) {
	const order = await Order.findById(id)
		.populate("userId", "email firstName lastName phone")
		.lean();
	if (!order) throw AppError.notFound("Order not found");
	return order;
}

export async function getOrderByNumber(orderNumber: string) {
	const order = await Order.findOne({ orderNumber }).lean();
	if (!order) throw AppError.notFound("Order not found");
	return order;
}

export async function getMyOrderById(userId: string, orderId: string) {
	const order = await Order.findById(orderId).lean();
	if (!order) throw AppError.notFound("Order not found");

	// Ownership check
	const isOwner = order.userId && String(order.userId) === String(userId);

	// Also allow guest orders where the customer later registered with the same email
	const isGuestOwner =
		!order.userId &&
		order.guestEmail &&
		order.guestEmail === (await User.findById(userId).lean())?.email;

	if (!isOwner && !isGuestOwner) {
		throw AppError.forbidden("You do not have access to this order");
	}

	return order;
}

export async function listOrders(query: ListOrdersQuery) {
	const filter: Record<string, unknown> = {};
	if (query.status) filter.status = query.status;
	const source = (query as ListOrdersQuery & { source?: string }).source;
	if (source) filter.source = source;
	if (query.from || query.to) {
		const range: Record<string, Date> = {};
		if (query.from) range.$gte = new Date(query.from);
		if (query.to) range.$lte = new Date(query.to);
		filter.createdAt = range;
	}
	if (query.q) {
		filter.$or = [
			{ orderNumber: new RegExp(query.q, "i") },
			{ guestEmail: new RegExp(query.q, "i") },
			{ "shippingAddress.fullName": new RegExp(query.q, "i") },
			{ "shippingAddress.phone": new RegExp(query.q, "i") },
		];
	}

	const [items, total] = await Promise.all([
		Order.find(filter)
			.sort({ createdAt: -1 })
			.skip((query.page - 1) * query.limit)
			.limit(query.limit)
			.lean(),
		Order.countDocuments(filter),
	]);

	return {
		items,
		total,
		page: query.page,
		limit: query.limit,
		pages: Math.ceil(total / query.limit),
	};
}

export async function updateOrderStatus(
	id: string,
	status: OrderStatus,
	actorId?: string,
	note?: string,
) {
	const order = await Order.findById(id);
	if (!order) throw AppError.notFound("Order not found");

	const previousStatus = order.status;

	// No-op if status is unchanged
	if (previousStatus === status) {
		return order;
	}

	const allowed: Record<OrderStatus, OrderStatus[]> = {
		pending: ["paid", "cancelled"],
		paid: ["processing", "cancelled", "refunded"],
		processing: ["shipped", "cancelled", "refunded"],
		shipped: ["delivered", "refunded"],
		delivered: ["refunded"],
		cancelled: [],
		refunded: [],
	};

	if (!allowed[order.status].includes(status)) {
		throw AppError.badRequest(`Cannot move from ${order.status} to ${status}`);
	}

	order.status = status;
	order.history.push({
		status,
		at: new Date(),
		by: actorId ? new Types.ObjectId(actorId) : undefined,
		note,
	});
	await order.save();

	await recordAudit({
		actorId,
		action: "order.status",
		entity: "Order",
		entityId: String(order._id),
		after: { status, note },
	});

	// ── Send the appropriate email ────────────────────────
	// Note: markOrderPaid already sends a confirmation email on `pending → paid`,
	// so we skip sending again here. All other transitions notify the customer.
	// Fire-and-forget — never block the operation on email delivery.
	const recipient = await getOrderRecipientEmail(order);
	if (recipient) {
		const customerName = order.shippingAddress?.fullName || "there";
		const orderNumber = order.orderNumber;

		void (async () => {
			try {
				switch (status) {
					case "processing":
						await emailService.sendOrderProcessingEmail({
							to: recipient,
							orderNumber,
							customerName,
						});
						break;

					case "shipped":
						await emailService.sendOrderShippedEmail({
							to: recipient,
							orderNumber,
							customerName,
							courier: order.fulfilment?.courier,
							trackingNo: order.fulfilment?.trackingNo,
						});
						break;

					case "delivered":
						await emailService.sendOrderDeliveredEmail({
							to: recipient,
							orderNumber,
							customerName,
						});
						break;

					case "cancelled":
						await emailService.sendOrderCancelledEmail({
							to: recipient,
							orderNumber,
							customerName,
							reason: note ? `Reason: ${note}` : undefined,
						});
						break;

					case "refunded":
						await emailService.sendOrderRefundedEmail({
							to: recipient,
							orderNumber,
							customerName,
							amount: order.total,
						});
						break;

					case "paid":
						// markOrderPaid already sends OrderConfirmationEmail.
						// If you ever move that responsibility here, uncomment:
						// await emailService.sendOrderConfirmationEmail({ ... });
						break;

					case "pending":
						// No email for pending.
						break;
				}
			} catch (err) {
				// Never let an email failure roll back the status change.
				// sendSafe already logs; this is defence-in-depth.
			}
		})();
	}

	return order;
}

export async function updateFulfilment(
	id: string,
	input: { courier?: string; trackingNo?: string; notes?: string },
) {
	const order = await Order.findById(id);
	if (!order) throw AppError.notFound("Order not found");

	order.fulfilment = { ...order.fulfilment, ...input };
	if (input.courier && !order.fulfilment.shippedAt) {
		order.fulfilment.shippedAt = new Date();
	}
	await order.save();
	return order;
}

export async function confirmBankTransfer(
	orderId: string,
	actorId: string,
	input: { receiptNote?: string; receiptProofUrl?: string },
): Promise<IOrder> {
	const order = await Order.findById(orderId);
	if (!order) throw AppError.notFound("Order not found");

	if (order.payment.provider !== "transfer_manual") {
		throw AppError.badRequest(
			"This endpoint is for bank-transfer orders only. Use the payment verify endpoint for online payments.",
		);
	}

	if (order.payment.status === "success") {
		throw AppError.badRequest("Payment is already confirmed");
	}

	// Capture receipt info first so markOrderPaid preserves it
	order.payment.receiptNote = input.receiptNote;
	order.payment.receiptProofUrl = input.receiptProofUrl;
	await order.save();

	const updated = await markOrderPaid(order.payment.reference, {
		source: "admin_confirmed",
		receiptNote: input.receiptNote,
		actorId,
	});

	if (!updated) throw AppError.internal("Failed to mark order paid");
	return updated;
}
