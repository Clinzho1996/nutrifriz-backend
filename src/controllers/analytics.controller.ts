import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/apiResponse";
import * as analyticsService from "../services/analytics.service";

export const overview = asyncHandler(async (_req: Request, res: Response) => {
	const data = await analyticsService.getOverview();
	return ok(res, data);
});

export const topProducts = asyncHandler(async (req: Request, res: Response) => {
	const limit = Number(req.query.limit ?? 5);
	const data = await analyticsService.getTopProducts(limit);
	return ok(res, data);
});

export const salesTrend = asyncHandler(async (req: Request, res: Response) => {
	const days = Number(req.query.days ?? 30);
	const data = await analyticsService.getSalesTrend(days);
	return ok(res, data);
});

export const categoryBreakdown = asyncHandler(
	async (_req: Request, res: Response) => {
		const data = await analyticsService.getCategoryBreakdown();
		return ok(res, data);
	},
);
