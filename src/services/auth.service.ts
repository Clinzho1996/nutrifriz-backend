import { IUser, User } from "../models/User";
import { IAddress } from "../types";
import { AppError } from "../utils/AppError";
import {
	signAccessToken,
	signRefreshToken,
	verifyRefreshToken,
} from "../utils/jwt";
import { comparePassword, hashPassword } from "../utils/password";
import { AddressInput, RegisterInput } from "../validators/auth.validator";
import { recordAudit } from "./audit.service";

interface AuthResult {
	user: Partial<IUser>;
	accessToken: string;
	refreshToken: string;
}

function publicUser(user: IUser) {
	return {
		_id: user._id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		phone: user.phone,
		role: user.role,
		emailVerified: user.emailVerified,
		addresses: user.addresses,
		crunchPoints: user.crunchPoints,
		createdAt: user.createdAt,
	};
}

export async function register(input: RegisterInput): Promise<AuthResult> {
	const existing = await User.findOne({ email: input.email }).lean();
	if (existing) throw AppError.conflict("Email already registered");

	const passwordHash = await hashPassword(input.password);
	const user = await User.create({
		email: input.email,
		passwordHash,
		firstName: input.firstName,
		lastName: input.lastName,
		phone: input.phone,
		role: "customer",
	});

	const accessToken = signAccessToken({
		sub: String(user._id),
		email: user.email,
		role: user.role,
	});
	const refreshToken = signRefreshToken({
		sub: String(user._id),
		email: user.email,
		role: user.role,
	});

	await recordAudit({
		actorId: user._id,
		action: "auth.register",
		entity: "User",
		entityId: String(user._id),
	});

	return { user: publicUser(user), accessToken, refreshToken };
}

export async function login(
	email: string,
	password: string,
): Promise<AuthResult> {
	const user = await User.findOne({ email }).select("+passwordHash");
	if (!user) throw AppError.unauthorized("Invalid credentials");

	const ok = await comparePassword(password, user.passwordHash);
	if (!ok) throw AppError.unauthorized("Invalid credentials");

	user.lastLoginAt = new Date();
	await user.save();

	const accessToken = signAccessToken({
		sub: String(user._id),
		email: user.email,
		role: user.role,
	});
	const refreshToken = signRefreshToken({
		sub: String(user._id),
		email: user.email,
		role: user.role,
	});

	return { user: publicUser(user), accessToken, refreshToken };
}

export async function refresh(refreshToken: string): Promise<AuthResult> {
	let payload;
	try {
		payload = verifyRefreshToken(refreshToken);
	} catch {
		throw AppError.unauthorized("Invalid refresh token");
	}

	const user = await User.findById(payload.sub);
	if (!user) throw AppError.unauthorized("User no longer exists");

	const accessToken = signAccessToken({
		sub: String(user._id),
		email: user.email,
		role: user.role,
	});
	const newRefreshToken = signRefreshToken({
		sub: String(user._id),
		email: user.email,
		role: user.role,
	});

	return { user: publicUser(user), accessToken, refreshToken: newRefreshToken };
}

export async function me(userId: string) {
	const user = await User.findById(userId).lean();
	if (!user) throw AppError.notFound("User not found");
	return publicUser(user as unknown as IUser);
}

export async function updateProfile(
	userId: string,
	input: { firstName?: string; lastName?: string; phone?: string },
) {
	const user = await User.findByIdAndUpdate(userId, input, { new: true });
	if (!user) throw AppError.notFound("User not found");
	return publicUser(user);
}

export async function changePassword(
	userId: string,
	currentPassword: string,
	newPassword: string,
) {
	const user = await User.findById(userId).select("+passwordHash");
	if (!user) throw AppError.notFound("User not found");

	const ok = await comparePassword(currentPassword, user.passwordHash);
	if (!ok) throw AppError.badRequest("Current password is incorrect");

	user.passwordHash = await hashPassword(newPassword);
	await user.save();
	return { success: true };
}

export async function addAddress(
	userId: string,
	address: AddressInput,
): Promise<IAddress[]> {
	const user = await User.findById(userId);
	if (!user) throw AppError.notFound("User not found");

	if (address.isDefault) {
		user.addresses.forEach((a) => (a.isDefault = false));
	}
	user.addresses.push(address as IAddress);
	await user.save();
	return user.addresses;
}

export async function removeAddress(
	userId: string,
	addressId: string,
): Promise<IAddress[]> {
	const user = await User.findById(userId);
	if (!user) throw AppError.notFound("User not found");
	user.addresses = user.addresses.filter(
		(a) => String((a as any)._id) !== addressId,
	);
	await user.save();
	return user.addresses;
}

export async function listUsers(query: {
	page: number;
	limit: number;
	q?: string;
	role?: string;
}) {
	const filter: Record<string, unknown> = {};
	if (query.q) {
		filter.$or = [
			{ email: new RegExp(query.q, "i") },
			{ firstName: new RegExp(query.q, "i") },
			{ lastName: new RegExp(query.q, "i") },
		];
	}
	if (query.role) filter.role = query.role;

	const [items, total] = await Promise.all([
		User.find(filter)
			.sort({ createdAt: -1 })
			.skip((query.page - 1) * query.limit)
			.limit(query.limit)
			.lean(),
		User.countDocuments(filter),
	]);

	return {
		items,
		total,
		page: query.page,
		limit: query.limit,
		pages: Math.ceil(total / query.limit),
	};
}
