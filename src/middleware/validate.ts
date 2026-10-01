import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError, ZodTypeAny } from "zod";
import { AppError } from "../utils/AppError";

type Schemas = {
	body?: ZodTypeAny;
	query?: ZodTypeAny;
	params?: ZodTypeAny;
};

export function validate(schemas: Schemas) {
	return async (
		req: Request,
		_res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			if (schemas.params)
				req.params = await schemas.params.parseAsync(req.params);
			if (schemas.query) req.query = await schemas.query.parseAsync(req.query);
			if (schemas.body) req.body = await schemas.body.parseAsync(req.body);
			next();
		} catch (err) {
			if (err instanceof ZodError) {
				const details = err.issues.map((i) => ({
					path: i.path.join("."),
					message: i.message,
				}));
				return next(AppError.unprocessable("Validation failed", details));
			}
			next(err);
		}
	};
}
