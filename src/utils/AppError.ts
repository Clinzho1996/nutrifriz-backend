export class AppError extends Error {
	public readonly statusCode: number;
	public readonly isOperational: boolean;
	public readonly code?: string;
	public readonly details?: unknown;

	constructor(
		statusCode: number,
		message: string,
		options: { code?: string; details?: unknown; isOperational?: boolean } = {},
	) {
		super(message);
		this.name = "AppError";
		this.statusCode = statusCode;
		this.isOperational = options.isOperational ?? true;
		this.code = options.code;
		this.details = options.details;
		Error.captureStackTrace(this, this.constructor);
	}

	static badRequest(message = "Bad request", details?: unknown) {
		return new AppError(400, message, { code: "BAD_REQUEST", details });
	}

	static unauthorized(message = "Unauthorized") {
		return new AppError(401, message, { code: "UNAUTHORIZED" });
	}

	static forbidden(message = "Forbidden") {
		return new AppError(403, message, { code: "FORBIDDEN" });
	}

	static notFound(message = "Resource not found") {
		return new AppError(404, message, { code: "NOT_FOUND" });
	}

	static conflict(message = "Conflict") {
		return new AppError(409, message, { code: "CONFLICT" });
	}

	static unprocessable(message = "Unprocessable entity", details?: unknown) {
		return new AppError(422, message, { code: "UNPROCESSABLE", details });
	}

	static internal(message = "Internal server error") {
		return new AppError(500, message, {
			code: "INTERNAL",
			isOperational: false,
		});
	}
}
