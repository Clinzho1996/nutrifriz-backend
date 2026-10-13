import { Request, Response } from "express";
import { recordAudit } from "../services/audit.service";
import * as categoryService from "../services/category.service";
import { created, ok, paginated } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const list = asyncHandler(async (req: Request, res: Response) => {
	const query = req.query as any;
	const result = await categoryService.listCategories(query);
	return paginated(res, result);
});

export const listPublic = asyncHandler(async (_req: Request, res: Response) => {
	const categories = await categoryService.listPublicCategories();
	return ok(res, categories);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
	const category = await categoryService.getCategoryById(req.params.id);
	return ok(res, category);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
	const category = await categoryService.createCategory(req.body);
	await recordAudit({
		actorId: String(req.user!._id),
		action: "category.create",
		entity: "Category",
		entityId: String(category._id),
		after: category.toObject(),
	});
	return created(res, category, "Category created");
});

export const update = asyncHandler(async (req: Request, res: Response) => {
	const category = await categoryService.updateCategory(
		req.params.id,
		req.body,
	);
	await recordAudit({
		actorId: String(req.user!._id),
		action: "category.update",
		entity: "Category",
		entityId: String(category._id),
		after: category.toObject(),
	});
	return ok(res, category, "Category updated");
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
	await categoryService.deleteCategory(req.params.id);
	await recordAudit({
		actorId: String(req.user!._id),
		action: "category.delete",
		entity: "Category",
		entityId: req.params.id,
	});
	return ok(res, { success: true }, "Category deleted");
});
