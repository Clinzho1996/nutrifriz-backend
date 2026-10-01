import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created, paginated } from "../utils/apiResponse";
import * as journalService from "../services/journal.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
	const query = req.query as any;
	const result = await journalService.listPosts(query);
	return paginated(res, result);
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
	const post = await journalService.getPostBySlug(req.params.slug);
	return ok(res, post);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
	const post = await journalService.createPost(req.body, String(req.user!._id));
	return created(res, post, "Post created");
});

export const update = asyncHandler(async (req: Request, res: Response) => {
	const post = await journalService.updatePost(req.params.id, req.body);
	return ok(res, post, "Post updated");
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
	await journalService.deletePost(req.params.id);
	return ok(res, { success: true }, "Post archived");
});
