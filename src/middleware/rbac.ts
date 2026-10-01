import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { Permission, Role } from "../types";

const ROLE_PERMISSIONS: Record<Role, Permission[] | ["*"]> = {
	customer: [],
	b2b: [],
	staff: [
		"products:*",
		"collections:*",
		"orders:*",
		"customers:*",
		"journal:*",
		"reviews:*",
		"b2b:*",
	],
	admin: [
		"products:*",
		"collections:*",
		"orders:*",
		"customers:*",
		"mix:*",
		"cards:*",
		"journal:*",
		"reviews:*",
		"b2b:*",
		"analytics:*",
	],
};

// superadmin is handled separately below (full access)
export function requireRole(
	...roles: Role[]
): (req: Request, _res: Response, next: NextFunction) => void {
	return (req, _res, next) => {
		if (!req.user) return next(AppError.unauthorized());
		if (roles.includes(req.user.role)) return next();
		return next(AppError.forbidden("Insufficient role"));
	};
}

export function requireAdmin(
	req: Request,
	_res: Response,
	next: NextFunction,
): void {
	if (!req.user) return next(AppError.unauthorized());
	if (req.user.role === "admin" || req.user.role === "staff") return next();
	// allow superadmin flag on admin role via email list if needed
	return next(AppError.forbidden("Admin access required"));
}

export function requireSuperadmin(
	req: Request,
	_res: Response,
	next: NextFunction,
): void {
	if (!req.user) return next(AppError.unauthorized());
	// superadmin is stored as admin with email matching SUPERADMIN_EMAILS env
	const superEmails = (process.env.SUPERADMIN_EMAILS ?? "")
		.split(",")
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
	if (
		req.user.role === "admin" &&
		superEmails.includes(req.user.email.toLowerCase())
	) {
		return next();
	}
	return next(AppError.forbidden("Superadmin access required"));
}

export function can(permission: Permission) {
	return (req: Request, _res: Response, next: NextFunction): void => {
		if (!req.user) return next(AppError.unauthorized());
		const perms = ROLE_PERMISSIONS[req.user.role] ?? [];
		if (perms.includes("*" as Permission) || perms.includes(permission))
			return next();
		return next(AppError.forbidden(`Missing permission: ${permission}`));
	};
}
