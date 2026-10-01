import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created, paginated } from "../utils/apiResponse";
import * as productService from "../services/product.service";
import * as reviewService from "../services/review.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
	const query = req.query as any;
	const result = await productService.listProducts(query);
	return paginated(res, result);
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
	const product = await productService.getProductBySlug(req.params.slug);
	return ok(res, product);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
	const product = await productService.getProductById(req.params.id);
	return ok(res, product);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
	const product = await productService.createProduct(req.body);
	return created(res, product, "Product created");
});

export const update = asyncHandler(async (req: Request, res: Response) => {
	const product = await productService.updateProduct(req.params.id, req.body);
	return ok(res, product, "Product updated");
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
	await productService.deleteProduct(req.params.id);
	return ok(res, { success: true }, "Product archived");
});

export const listProductReviews = asyncHandler(
	async (req: Request, res: Response) => {
		const reviews = await reviewService.listApprovedForProduct(req.params.id);
		return ok(res, reviews);
	},
);
