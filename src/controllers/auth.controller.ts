import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created } from "../utils/apiResponse";
import * as authService from "../services/auth.service";

export const register = asyncHandler(async (req: Request, res: Response) => {
	const result = await authService.register(req.body);
	return created(res, result, "Registered successfully");
});

export const login = asyncHandler(async (req: Request, res: Response) => {
	const { email, password } = req.body;
	const result = await authService.login(email, password);
	return ok(res, result, "Logged in");
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
	const result = await authService.refresh(req.body.refreshToken);
	return ok(res, result, "Token refreshed");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
	const user = await authService.me(String(req.user!._id));
	return ok(res, user);
});

export const updateProfile = asyncHandler(
	async (req: Request, res: Response) => {
		const user = await authService.updateProfile(
			String(req.user!._id),
			req.body,
		);
		return ok(res, user, "Profile updated");
	},
);

export const changePassword = asyncHandler(
	async (req: Request, res: Response) => {
		const result = await authService.changePassword(
			String(req.user!._id),
			req.body.currentPassword,
			req.body.newPassword,
		);
		return ok(res, result, "Password updated");
	},
);

export const listAddresses = asyncHandler(
	async (req: Request, res: Response) => {
		const user = await authService.me(String(req.user!._id));
		return ok(res, user.addresses);
	},
);

export const addAddress = asyncHandler(async (req: Request, res: Response) => {
	const addresses = await authService.addAddress(
		String(req.user!._id),
		req.body,
	);
	return created(res, addresses, "Address added");
});

export const removeAddress = asyncHandler(
	async (req: Request, res: Response) => {
		const addresses = await authService.removeAddress(
			String(req.user!._id),
			req.params.addressId,
		);
		return ok(res, addresses, "Address removed");
	},
);

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
	const result = await authService.listUsers({
		page: Number(req.query.page ?? 1),
		limit: Number(req.query.limit ?? 20),
		q: req.query.q as string | undefined,
		role: req.query.role as string | undefined,
	});
	return ok(res, result);
});
