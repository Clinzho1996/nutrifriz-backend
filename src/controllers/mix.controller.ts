import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created } from "../utils/apiResponse";
import * as mixService from "../services/mix.service";

export const listRules = asyncHandler(async (_req: Request, res: Response) => {
	const rules = await mixService.listRules();
	return ok(res, rules);
});

export const upsertRule = asyncHandler(async (req: Request, res: Response) => {
	const rule = await mixService.upsertRule(req.body);
	return ok(res, rule, "Mix rule saved");
});

export const priceMix = asyncHandler(async (req: Request, res: Response) => {
	const result = await mixService.priceMix(req.body);
	return ok(res, result);
});

export const saveMix = asyncHandler(async (req: Request, res: Response) => {
	const userId = req.user ? String(req.user._id) : undefined;
	const guestEmail = req.user
		? undefined
		: (req.body.guestEmail as string | undefined);
	const mix = await mixService.saveMix(userId, guestEmail, req.body);
	return created(res, mix, "Mix saved");
});

export const getMix = asyncHandler(async (req: Request, res: Response) => {
	const mix = await mixService.getMixById(req.params.id);
	return ok(res, mix);
});

export const listMyMixes = asyncHandler(async (req: Request, res: Response) => {
	const mixes = await mixService.listMixesForUser(String(req.user!._id));
	return ok(res, mixes);
});

export const deleteMix = asyncHandler(async (req: Request, res: Response) => {
	await mixService.deleteMix(req.params.id, String(req.user!._id));
	return ok(res, { success: true }, "Mix deleted");
});
