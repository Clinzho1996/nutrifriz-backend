import { Order } from "../models/Order";
import { Product } from "../models/Product";
import { User } from "../models/User";
import { B2BLead } from "../models/B2BLead";
import { Review } from "../models/Review";
import { CrunchCard } from "../models/CrunchCard";

export async function getOverview() {
	const [
		revenueAgg,
		paidOrderCount,
		pendingOrderCount,
		customerCount,
		b2bNewCount,
		pendingReviews,
		lowStock,
		registeredCards,
		recentOrders,
	] = await Promise.all([
		Order.aggregate<{ total: number }>([
			{
				$match: {
					status: { $in: ["paid", "processing", "shipped", "delivered"] },
				},
			},
			{ $group: { _id: null, total: { $sum: "$total" } } },
		]),
		Order.countDocuments({
			status: { $in: ["paid", "processing", "shipped", "delivered"] },
		}),
		Order.countDocuments({ status: "pending" }),
		User.countDocuments({ role: "customer" }),
		B2BLead.countDocuments({ status: "new" }),
		Review.countDocuments({ status: "pending" }),
		Product.find({ "packSizes.stock": { $lt: 20 }, status: "published" })
			.select("name slug packSizes")
			.lean(),
		CrunchCard.countDocuments({ status: "registered" }),
		Order.find()
			.sort({ createdAt: -1 })
			.limit(10)
			.select(
				"orderNumber total status createdAt guestEmail shippingAddress.fullName",
			)
			.lean(),
	]);

	return {
		revenue: revenueAgg[0]?.total ?? 0,
		paidOrders: paidOrderCount,
		pendingOrders: pendingOrderCount,
		customers: customerCount,
		b2bNewLeads: b2bNewCount,
		pendingReviews,
		lowStock,
		registeredCards,
		recentOrders,
	};
}

export async function getTopProducts(limit = 5) {
	return Order.aggregate([
		{
			$match: {
				status: { $in: ["paid", "processing", "shipped", "delivered"] },
			},
		},
		{ $unwind: "$items" },
		{ $match: { "items.kind": "product" } },
		{
			$group: {
				_id: "$items.refId",
				name: { $first: "$items.name" },
				qty: { $sum: "$items.qty" },
				revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.qty"] } },
			},
		},
		{ $sort: { qty: -1 } },
		{ $limit: limit },
	]);
}

export async function getSalesTrend(days = 30) {
	const since = new Date();
	since.setDate(since.getDate() - days);

	return Order.aggregate([
		{
			$match: {
				createdAt: { $gte: since },
				status: { $in: ["paid", "processing", "shipped", "delivered"] },
			},
		},
		{
			$group: {
				_id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
				revenue: { $sum: "$total" },
				orders: { $sum: 1 },
			},
		},
		{ $sort: { _id: 1 } },
	]);
}

export async function getCategoryBreakdown() {
	return Order.aggregate([
		{
			$match: {
				status: { $in: ["paid", "processing", "shipped", "delivered"] },
			},
		},
		{ $unwind: "$items" },
		{
			$group: {
				_id: "$items.kind",
				revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.qty"] } },
				count: { $sum: "$items.qty" },
			},
		},
	]);
}
