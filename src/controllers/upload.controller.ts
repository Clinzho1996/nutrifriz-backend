import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/apiResponse";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

/**
 * Returns a signed payload for direct client upload to Cloudinary.
 * No secret is exposed — only signature + api key.
 * If Cloudinary is not configured, this endpoint returns 501.
 */
export const signCloudinaryUpload = asyncHandler(
	async (req: Request, res: Response) => {
		if (
			!env.cloudinary.apiSecret ||
			!env.cloudinary.apiKey ||
			!env.cloudinary.cloudName
		) {
			throw AppError.internal("Upload provider not configured");
		}

		const timestamp = Math.floor(Date.now() / 1000);
		const folder = (req.body?.folder as string) || "nutrifriz";

		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const crypto = require("crypto");
		const toSign = `folder=${folder}&timestamp=${timestamp}${env.cloudinary.apiSecret}`;
		const signature = crypto.createHash("sha1").update(toSign).digest("hex");

		return ok(res, {
			cloudName: env.cloudinary.cloudName,
			apiKey: env.cloudinary.apiKey,
			timestamp,
			folder,
			signature,
		});
	},
);
