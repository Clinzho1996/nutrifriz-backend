import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/jwt";

export function requireAuth(
	req: Request,
	_res: Response,
	next: NextFunction,
): void {
	const header = req.headers.authorization;
	if (!header || !header.startsWith("Bearer ")) {
		return next(
			AppError.unauthorized("Missing or malformed Authorization header"),
		);
	}

	const token = header.slice("Bearer ".length).trim();
	if (!token) return next(AppError.unauthorized("Missing token"));

	try {
		const payload = verifyAccessToken(token);
		req.user = {
			_id: payload.sub as any,
			email: payload.email,
			role: payload.role,
		};
		next();
	} catch {
		next(AppError.unauthorized("Invalid or expired token"));
	}
}

export function optionalAuth(
	req: Request,
	_res: Response,
	next: NextFunction,
): void {
	const header = req.headers.authorization;
	if (!header || !header.startsWith("Bearer ")) return next();

	try {
		const payload = verifyAccessToken(header.slice("Bearer ".length).trim());
		req.user = {
			_id: payload.sub as any,
			email: payload.email,
			role: payload.role,
		};
	} catch {
		// ignore invalid token for optional auth
	}
	next();
}
