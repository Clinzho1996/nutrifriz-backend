import { Request, Response } from "express";
import * as svc from "../services/journal-category.service";
import { created, ok, paginated } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const listPublic = asyncHandler(async (_req: Request, res: Response) => {
	const categories = await svc.listPublicCategories();
	return ok(res, categories);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
	const query = req.query as any;
	const result = await svc.listCategories(query);
	return paginated(res, result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
	const category = await svc.getCategoryById(req.params.id);
	return ok(res, category);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
	const category = await svc.createCategory(req.body, String(req.user!._id));
	return created(res, category, "Category created");
});

export const update = asyncHandler(async (req: Request, res: Response) => {
	const category = await svc.updateCategory(
		req.params.id,
		req.body,
		String(req.user!._id),
	);
	return ok(res, category, "Category updated");
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
	await svc.deleteCategory(req.params.id, String(req.user!._id));
	return ok(res, { success: true }, "Category deleted");
});
