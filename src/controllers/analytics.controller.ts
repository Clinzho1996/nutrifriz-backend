import { Request, Response } from "express";
import * as analyticsService from "../services/analytics.service";
import { ok } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

function range(req: Request) {
	const from = typeof req.query.from === "string" ? req.query.from : undefined;
	const to = typeof req.query.to === "string" ? req.query.to : undefined;
	return { from, to };
}

export const overview = asyncHandler(async (req: Request, res: Response) => {
	const data = await analyticsService.getOverview(range(req));
	return ok(res, data);
});

export const topProducts = asyncHandler(async (req: Request, res: Response) => {
	const limit = Number(req.query.limit ?? 5);
	const data = await analyticsService.getTopProducts(limit, range(req));
	return ok(res, data);
});

export const salesTrend = asyncHandler(async (req: Request, res: Response) => {
	const days = Number(req.query.days ?? 30);
	const data = await analyticsService.getSalesTrend(range(req), days);
	return ok(res, data);
});

export const categoryBreakdown = asyncHandler(
	async (req: Request, res: Response) => {
		const data = await analyticsService.getCategoryBreakdown(range(req));
		return ok(res, data);
	},
);

export const exportTrendCsv = asyncHandler(
	async (req: Request, res: Response) => {
		const csv = await analyticsService.exportSalesTrendCsv(range(req));

		const filename = `nutrifriz-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
		res.setHeader("Content-Type", "text/csv; charset=utf-8");
		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
		res.setHeader("Cache-Control", "no-store");
		res.status(200).send(csv);
	},
);
