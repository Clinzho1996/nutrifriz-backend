import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";
import { logger } from "../config/logger";

interface ErrorBody {
	success: false;
	message: string;
	code?: string;
	details?: unknown;
	stack?: string;
}

export function errorHandler(
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
): Response<ErrorBody> {
	// Known operational errors
	if (err instanceof AppError) {
		if (!err.isOperational || err.statusCode >= 500) {
			logger.error({ err }, err.message);
		}
		return res.status(err.statusCode).json({
			success: false,
			message: err.message,
			code: err.code,
			details: err.details,
		});
	}

	// Zod
	if (err instanceof ZodError) {
		return res.status(422).json({
			success: false,
			message: "Validation failed",
			code: "VALIDATION",
			details: err.issues.map((i) => ({
				path: i.path.join("."),
				message: i.message,
			})),
		});
	}

	// Mongoose validation
	if (err instanceof mongoose.Error.ValidationError) {
		return res.status(422).json({
			success: false,
			message: "Validation failed",
			code: "MONGOOSE_VALIDATION",
			details: Object.values(err.errors).map((e) => ({
				path: e.path,
				message: e.message,
			})),
		});
	}

	// Mongo duplicate key
	const mongoErr = err as { code?: number; keyValue?: Record<string, unknown> };
	if (mongoErr && mongoErr.code === 11000) {
		return res.status(409).json({
			success: false,
			message: "Duplicate key",
			code: "DUPLICATE",
			details: mongoErr.keyValue,
		});
	}

	// Mongo cast error
	if (err instanceof mongoose.Error.CastError) {
		return res.status(400).json({
			success: false,
			message: `Invalid ${err.path}: ${err.value}`,
			code: "CAST_ERROR",
		});
	}

	// Unknown
	logger.error({ err }, "Unhandled error");
	return res.status(500).json({
		success: false,
		message: "Internal server error",
		code: "INTERNAL",
		...(env.isProduction ? {} : { stack: (err as Error)?.stack }),
	});
}
