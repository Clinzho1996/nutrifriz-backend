import bcrypt from "bcryptjs";
import { FilterQuery, Types } from "mongoose";
import { env } from "../config/env";
import { Order } from "../models/Order";
import { IUser, User } from "../models/User";
import { AppError } from "../utils/AppError";
import { parseCsv, toCsv } from "../utils/csv";
import { recordAudit } from "./audit.service";

export interface CustomerListQuery {
	page: number;
	limit: number;
	q?: string;
	role?: string;
	from?: string;
	to?: string;
}

export interface CustomerRow {
	_id: string;
	email: string;
	firstName: string;
	lastName: string;
	phone?: string;
	role: string;
	emailVerified: boolean;
	crunchPoints: number;
	orderCount: number;
	totalSpend: number;
	createdAt: string;
}

function buildFilter(query: CustomerListQuery): FilterQuery<IUser> {
	const filter: FilterQuery<IUser> = {};
	if (query.role) filter.role = query.role;
	if (query.q) {
		filter.$or = [
			{ email: new RegExp(query.q, "i") },
			{ firstName: new RegExp(query.q, "i") },
			{ lastName: new RegExp(query.q, "i") },
			{ phone: new RegExp(query.q, "i") },
		];
	}
	if (query.from || query.to) {
		const range: Record<string, Date> = {};
		if (query.from) range.$gte = new Date(query.from);
		if (query.to) range.$lte = new Date(query.to);
		filter.createdAt = range as any;
	}
	return filter;
}

export async function listCustomers(query: CustomerListQuery) {
	const filter = buildFilter(query);
	const [items, total] = await Promise.all([
		User.find(filter)
			.sort({ createdAt: -1 })
			.skip((query.page - 1) * query.limit)
			.limit(query.limit)
			.lean(),
		User.countDocuments(filter),
	]);

	// Attach order stats in one aggregate query
	const userIds = items.map((u) => u._id);
	const stats = await Order.aggregate<{
		_id: Types.ObjectId;
		orderCount: number;
		totalSpend: number;
	}>([
		{
			$match: {
				userId: { $in: userIds },
				status: { $in: ["paid", "processing", "shipped", "delivered"] },
			},
		},
		{
			$group: {
				_id: "$userId",
				orderCount: { $sum: 1 },
				totalSpend: { $sum: "$total" },
			},
		},
	]);
	const statMap = new Map(stats.map((s) => [String(s._id), s]));

	return {
		items: items.map((u) => {
			const s = statMap.get(String(u._id));
			return {
				_id: String(u._id),
				email: u.email,
				firstName: u.firstName,
				lastName: u.lastName,
				phone: u.phone,
				role: u.role,
				emailVerified: u.emailVerified,
				crunchPoints: u.crunchPoints,
				orderCount: s?.orderCount ?? 0,
				totalSpend: s?.totalSpend ?? 0,
				createdAt: u.createdAt.toISOString(),
			};
		}),
		total,
		page: query.page,
		limit: query.limit,
		pages: Math.ceil(total / query.limit),
	};
}

export async function getCustomerById(id: string) {
	const user = await User.findById(id).lean();
	if (!user) throw AppError.notFound("Customer not found");

	const orders = await Order.find({ userId: new Types.ObjectId(id) })
		.sort({ createdAt: -1 })
		.limit(20)
		.lean();

	const totalSpend = orders
		.filter((o) =>
			["paid", "processing", "shipped", "delivered"].includes(o.status),
		)
		.reduce((sum, o) => sum + o.total, 0);

	return {
		user: {
			_id: String(user._id),
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			phone: user.phone,
			role: user.role,
			emailVerified: user.emailVerified,
			crunchPoints: user.crunchPoints,
			addresses: user.addresses,
			createdAt: user.createdAt,
		},
		orders,
		totalSpend,
	};
}

export async function exportCustomersCsv(
	query: CustomerListQuery,
): Promise<string> {
	// Fetch all matching (no pagination) — cap at 10k to keep memory sane
	const filter = buildFilter(query);
	const users = await User.find(filter)
		.sort({ createdAt: -1 })
		.limit(10_000)
		.lean();

	const userIds = users.map((u) => u._id);
	const stats = await Order.aggregate<{
		_id: Types.ObjectId;
		orderCount: number;
		totalSpend: number;
	}>([
		{
			$match: {
				userId: { $in: userIds },
				status: { $in: ["paid", "processing", "shipped", "delivered"] },
			},
		},
		{
			$group: {
				_id: "$userId",
				orderCount: { $sum: 1 },
				totalSpend: { $sum: "$total" },
			},
		},
	]);
	const statMap = new Map(stats.map((s) => [String(s._id), s]));

	const rows: CustomerRow[] = users.map((u) => {
		const s = statMap.get(String(u._id));
		return {
			_id: String(u._id),
			email: u.email,
			firstName: u.firstName,
			lastName: u.lastName,
			phone: u.phone ?? "",
			role: u.role,
			emailVerified: u.emailVerified,
			crunchPoints: u.crunchPoints,
			orderCount: s?.orderCount ?? 0,
			totalSpend: s?.totalSpend ?? 0,
			createdAt: u.createdAt.toISOString(),
		};
	});

	return toCsv(rows as unknown as Record<string, unknown>[], [
		{ key: "email", header: "email" },
		{ key: "firstName", header: "firstName" },
		{ key: "lastName", header: "lastName" },
		{ key: "phone", header: "phone" },
		{ key: "role", header: "role" },
		{ key: "emailVerified", header: "emailVerified" },
		{ key: "crunchPoints", header: "crunchPoints" },
		{ key: "orderCount", header: "orderCount" },
		{ key: "totalSpend", header: "totalSpend" },
		{ key: "createdAt", header: "createdAt" },
	]);
}

export interface ImportResult {
	imported: number;
	skipped: number;
	errors: { row: number; email?: string; reason: string }[];
	created: { email: string; id: string }[];
}

export interface ImportOptions {
	defaultPassword?: string;
	role?: "customer" | "b2b";
	updateExisting?: boolean;
}

export async function importCustomersCsv(
	raw: string,
	options: ImportOptions,
	actorId?: string,
): Promise<ImportResult> {
	const rows = parseCsv(raw);
	if (rows.length === 0) throw AppError.badRequest("CSV contains no data rows");

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const defaultPassword = options.defaultPassword ?? "Welcome@123";
	const role = options.role ?? "customer";

	const result: ImportResult = {
		imported: 0,
		skipped: 0,
		errors: [],
		created: [],
	};

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const rowNum = i + 2; // header is row 1
		const email = (row.email ?? row.Email ?? "").toLowerCase().trim();

		if (!email) {
			result.errors.push({ row: rowNum, reason: "Missing email column" });
			continue;
		}
		if (!emailRegex.test(email)) {
			result.errors.push({
				row: rowNum,
				email,
				reason: "Invalid email format",
			});
			continue;
		}

		const existing = await User.findOne({ email });

		if (existing && !options.updateExisting) {
			result.skipped += 1;
			continue;
		}

		const firstName = row.firstName ?? row["First Name"] ?? "";
		const lastName = row.lastName ?? row["Last Name"] ?? "";
		const phone = row.phone ?? row.Phone ?? undefined;

		if (existing && options.updateExisting) {
			// Update only the fields provided
			if (firstName) existing.firstName = firstName;
			if (lastName) existing.lastName = lastName;
			if (phone) existing.phone = phone;
			await existing.save();
			result.imported += 1;
			continue;
		}

		try {
			const passwordHash = await bcrypt.hash(defaultPassword, env.bcryptRounds);
			const created = await User.create({
				email,
				passwordHash,
				firstName: firstName || "Customer",
				lastName: lastName || "",
				phone,
				role,
				emailVerified: false,
			});
			result.imported += 1;
			result.created.push({ email, id: String(created._id) });
		} catch (err) {
			result.errors.push({
				row: rowNum,
				email,
				reason: (err as Error).message ?? "Insert failed",
			});
		}
	}

	await recordAudit({
		actorId,
		action: "customers.import",
		entity: "User",
		after: {
			imported: result.imported,
			skipped: result.skipped,
			errored: result.errors.length,
			updateExisting: options.updateExisting ?? false,
		},
	});

	return result;
}
