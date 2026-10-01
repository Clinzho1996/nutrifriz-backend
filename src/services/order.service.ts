import { Types } from "mongoose";
import { Order, IOrder, IOrderItem } from "../models/Order";
import { Product } from "../models/Product";
import { Collection, ICollection } from "../models/Collection";
import { MixConfig } from "../models/MixConfig";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { nextOrderNumber } from "../utils/orderNumber";
import { recordAudit } from "./audit.service";
import { initializeTransaction } from "./paystack.service";
import {
	CheckoutInitInput,
	ListOrdersQuery,
} from "../validators/order.validator";
import { OrderStatus } from "../types";

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

export async function createPendingOrder(
	userId: string | undefined,
	input: CheckoutInitInput,
): Promise<{ order: IOrder; paymentLink: string }> {
	const { items, subtotal } = await buildCartItems(input.items);
	const shippingFee = input.shippingFee ?? 0;
	const total = subtotal + shippingFee;

	const orderNumber = await nextOrderNumber(Order);
	const reference = `NFZ_${orderNumber}_${Date.now()}`;

	const order = await Order.create({
		orderNumber,
		userId: userId ? new Types.ObjectId(userId) : undefined,
		guestEmail: userId ? undefined : input.email,
		items,
		subtotal,
		shippingFee,
		total,
		currency: "NGN",
		shippingAddress: input.shippingAddress,
		status: "pending",
		payment: { provider: "paystack", reference, status: "init" },
		history: [{ status: "pending", at: new Date() }],
	});

	const init = await initializeTransaction({
		email: input.email,
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
	});

	// attach authorization_url temporarily to raw
	order.payment.raw = { authorization_url: init.authorization_url };
	await order.save();

	await recordAudit({
		actorId: userId,
		action: "order.init",
		entity: "Order",
		entityId: String(order._id),
		after: { orderNumber, total },
	});

	return { order, paymentLink: init.authorization_url };
}

export async function markOrderPaid(
	reference: string,
	payload?: Record<string, unknown>,
): Promise<IOrder | null> {
	const order = await Order.findOne({ "payment.reference": reference });
	if (!order) return null;
	if (order.payment.status === "success") return order;

	order.payment.status = "success";
	order.payment.paidAt = new Date();
	order.payment.raw = { ...(order.payment.raw ?? {}), ...(payload ?? {}) };
	order.status = "paid";
	order.history.push({ status: "paid", at: new Date() });

	await order.save();

	// Deduct stock for product lines
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

	// Award crunch points (1 per ₦1000 spent) — simple rule
	if (order.userId) {
		const points = Math.floor(order.total / 1000);
		if (points > 0) {
			await User.findByIdAndUpdate(order.userId, {
				$inc: { crunchPoints: points },
			});
		}
	}

	await recordAudit({
		action: "order.paid",
		entity: "Order",
		entityId: String(order._id),
		after: { reference, total: order.total },
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

export async function listOrders(query: ListOrdersQuery) {
	const filter: Record<string, unknown> = {};
	if (query.status) filter.status = query.status;
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
