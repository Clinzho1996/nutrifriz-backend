import { B2BLead } from "../models/B2BLead";
import { CrunchCard } from "../models/CrunchCard";
import { Order } from "../models/Order";
import { Product } from "../models/Product";
import { Review } from "../models/Review";
import { User } from "../models/User";

export interface DateRange {
	from?: string;
	to?: string;
}

interface RangeFilter {
	$gte?: Date;
	$lte?: Date;
}

function buildRange(range?: DateRange): RangeFilter | undefined {
	if (!range?.from && !range?.to) return undefined;
	const r: RangeFilter = {};
	if (range.from) r.$gte = new Date(range.from);
	if (range.to) {
		// Include the entire end day
		const end = new Date(range.to);
		end.setHours(23, 59, 59, 999);
		r.$lte = end;
	}
	return r;
}

export async function getOverview(range?: DateRange) {
	const createdAt = buildRange(range);

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
					...(createdAt ? { createdAt } : {}),
				},
			},
			{ $group: { _id: null, total: { $sum: "$total" } } },
		]),
		Order.countDocuments({
			status: { $in: ["paid", "processing", "shipped", "delivered"] },
			...(createdAt ? { createdAt } : {}),
		}),
		Order.countDocuments({
			status: "pending",
			...(createdAt ? { createdAt } : {}),
		}),
		User.countDocuments({
			role: "customer",
			...(createdAt ? { createdAt } : {}),
		}),
		B2BLead.countDocuments({
			status: "new",
			...(createdAt ? { createdAt } : {}),
		}),
		Review.countDocuments({
			status: "pending",
			...(createdAt ? { createdAt } : {}),
		}),
		Product.find({ "packSizes.stock": { $lt: 20 }, status: "published" })
			.select("name slug packSizes")
			.lean(),
		CrunchCard.countDocuments({
			status: "registered",
			...(createdAt ? { registeredAt: createdAt } : {}),
		}),
		Order.find(createdAt ? { createdAt } : {})
			.sort({ createdAt: -1 })
			.limit(10)
			.select(
				"orderNumber total status createdAt guestEmail shippingAddress.fullName source",
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

export async function getTopProducts(limit = 5, range?: DateRange) {
	const createdAt = buildRange(range);
	return Order.aggregate([
		{
			$match: {
				status: { $in: ["paid", "processing", "shipped", "delivered"] },
				...(createdAt ? { createdAt } : {}),
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

export async function getSalesTrend(range?: DateRange, defaultDays = 30) {
	const createdAt =
		buildRange(range) ??
		(() => {
			const since = new Date();
			since.setDate(since.getDate() - defaultDays);
			return { $gte: since };
		})();

	return Order.aggregate([
		{
			$match: {
				createdAt,
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

export async function getCategoryBreakdown(range?: DateRange) {
	const createdAt = buildRange(range);
	return Order.aggregate([
		{
			$match: {
				status: { $in: ["paid", "processing", "shipped", "delivered"] },
				...(createdAt ? { createdAt } : {}),
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

export interface AnalyticsExportRow {
	date: string;
	orders: number;
	revenue: number;
}

export async function exportSalesTrendCsv(range?: DateRange): Promise<string> {
	const trend = await getSalesTrend(range);
	const rows: AnalyticsExportRow[] = trend.map((t) => ({
		date: t._id,
		orders: t.orders,
		revenue: t.revenue,
	}));

	const header = "date,orders,revenue\n";
	const body = rows.map((r) => `${r.date},${r.orders},${r.revenue}`).join("\n");
	return header + body;
}
