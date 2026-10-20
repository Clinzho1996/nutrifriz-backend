import { Request, Response } from "express";
import * as reviewService from "../services/review.service";
import { created, ok, paginated } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const create = asyncHandler(async (req: Request, res: Response) => {
	const review = await reviewService.createReview(
		String(req.user!._id),
		req.body,
	);
	return created(res, review, "Review submitted for moderation");
});

export const canReview = asyncHandler(async (req: Request, res: Response) => {
	const { productId } = req.params;
	const result = await reviewService.canReviewProduct(
		String(req.user!._id),
		productId,
	);
	return ok(res, result);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
	const query = req.query as any;
	const result = await reviewService.listReviews(query);
	return paginated(res, result);
});

export const moderate = asyncHandler(async (req: Request, res: Response) => {
	const review = await reviewService.moderateReview(
		req.params.id,
		req.body.status,
		String(req.user!._id),
	);
	return ok(res, review, "Review moderated");
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
	await reviewService.deleteReview(req.params.id, String(req.user!._id));
	return ok(res, { success: true }, "Review deleted");
});
