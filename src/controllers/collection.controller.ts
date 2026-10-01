import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created, paginated } from "../utils/apiResponse";
import * as collectionService from "../services/collection.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
	const query = req.query as any;
	const result = await collectionService.listCollections({
		page: query.page,
		limit: query.limit,
		status: query.status,
		occasion: query.occasion,
		q: query.q,
		featured: query.featured,
	});
	return paginated(res, result);
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
	const collection = await collectionService.getCollectionBySlug(
		req.params.slug,
	);
	return ok(res, collection);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
	const collection = await collectionService.getCollectionById(req.params.id);
	return ok(res, collection);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
	const collection = await collectionService.createCollection(req.body);
	return created(res, collection, "Collection created");
});

export const update = asyncHandler(async (req: Request, res: Response) => {
	const collection = await collectionService.updateCollection(
		req.params.id,
		req.body,
	);
	return ok(res, collection, "Collection updated");
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
	await collectionService.deleteCollection(req.params.id);
	return ok(res, { success: true }, "Collection archived");
});
