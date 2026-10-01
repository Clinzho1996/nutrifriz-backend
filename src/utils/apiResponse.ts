import { Response } from "express";
import { PaginatedResult } from "../types";

export function ok<T>(res: Response, data: T, message = "OK", status = 200) {
	return res.status(status).json({
		success: true,
		message,
		data,
	});
}

export function created<T>(res: Response, data: T, message = "Created") {
	return ok(res, data, message, 201);
}

export function noContent(res: Response) {
	return res.status(204).send();
}

export function paginated<T>(
	res: Response,
	result: PaginatedResult<T>,
	message = "OK",
) {
	return res.status(200).json({
		success: true,
		message,
		data: result.items,
		meta: {
			total: result.total,
			page: result.page,
			limit: result.limit,
			pages: result.pages,
		},
	});
}

export function fail(
	res: Response,
	status: number,
	message: string,
	code?: string,
	details?: unknown,
) {
	return res.status(status).json({
		success: false,
		message,
		code,
		details,
	});
}
