import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created, paginated } from "../utils/apiResponse";
import * as cardService from "../services/card.service";

export const listSeries = asyncHandler(async (_req: Request, res: Response) => {
	const series = await cardService.listSeries();
	return ok(res, series);
});

export const createSeries = asyncHandler(
	async (req: Request, res: Response) => {
		const series = await cardService.createSeries(req.body);
		return created(res, series, "Series created");
	},
);

export const updateSeries = asyncHandler(
	async (req: Request, res: Response) => {
		const series = await cardService.updateSeries(req.params.id, req.body);
		return ok(res, series, "Series updated");
	},
);

export const issueCards = asyncHandler(async (req: Request, res: Response) => {
	const cards = await cardService.issueCards(req.params.id, req.body);
	return created(res, cards, `${cards.length} cards issued`);
});

export const listCards = asyncHandler(async (req: Request, res: Response) => {
	const query = req.query as any;
	const result = await cardService.listCards(query);
	return paginated(res, result);
});

export const register = asyncHandler(async (req: Request, res: Response) => {
	const result = await cardService.registerCard(
		String(req.user!._id),
		req.body.cardCode,
	);
	return ok(res, result, "Card registered");
});

export const myPassport = asyncHandler(async (req: Request, res: Response) => {
	const seriesId = req.query.seriesId as string | undefined;
	const passport = await cardService.getPassport(
		String(req.user!._id),
		seriesId,
	);
	return ok(res, passport);
});
