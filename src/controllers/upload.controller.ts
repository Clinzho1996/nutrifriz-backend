import { Request, Response } from "express";
import multer from "multer";
import { env } from "../config/env";
import { ok } from "../utils/apiResponse";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * Configure multer for memory storage. Files are streamed to the upstream
 * provider (Cloudinary in production) and never written to disk.
 *
 * Limits:
 *  - 5MB per file
 *  - 10 files per batch
 *  - only image mime types
 */
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024, files: 10 },
	fileFilter: (_req, file, cb) => {
		if (!file.mimetype.startsWith("image/")) {
			return cb(new AppError(400, "Only image files are allowed"));
		}
		cb(null, true);
	},
});

export const uploadMiddleware = upload.array("files", 10);

interface UploadedFile {
	url: string;
	publicId?: string;
	width?: number;
	height?: number;
	bytes: number;
	originalName: string;
}

/**
 * POST /admin/uploads/batch
 * Multipart form data. Field name: "files" (multiple).
 * Returns { files: UploadedFile[] }
 */
export const uploadBatch = asyncHandler(async (req: Request, res: Response) => {
	const files = (req.files as Express.Multer.File[]) ?? [];
	if (files.length === 0) throw AppError.badRequest("No files uploaded");

	const uploaded = await Promise.all(
		files.map((file) => uploadToProvider(file)),
	);

	return ok(res, { files: uploaded }, `${uploaded.length} file(s) uploaded`);
});

/**
 * POST /admin/uploads/sign
 * Returns a Cloudinary signature so the client can upload directly.
 * Kept for the direct-upload flow used by the admin (see ImageUploader).
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

/**
 * Provider abstraction. Today: Cloudinary. Tomorrow: S3, R2, whatever.
 * If Cloudinary is not configured in dev, fall back to a data URL so the
 * admin still works locally without credentials.
 */
async function uploadToProvider(
	file: Express.Multer.File,
): Promise<UploadedFile> {
	if (
		!env.cloudinary.cloudName ||
		!env.cloudinary.apiKey ||
		!env.cloudinary.apiSecret
	) {
		if (!env.isProduction) {
			const base64 = file.buffer.toString("base64");
			return {
				url: `data:${file.mimetype};base64,${base64}`,
				bytes: file.size,
				originalName: file.originalname,
			};
		}
		throw AppError.internal("Upload provider not configured");
	}

	// Cloudinary unsigned upload via REST API (avoids adding the SDK as a dep)
	const timestamp = Math.floor(Date.now() / 1000);
	const folder = "nutrifriz/products";

	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const crypto = require("crypto");
	const toSign = `folder=${folder}&timestamp=${timestamp}${env.cloudinary.apiSecret}`;
	const signature = crypto.createHash("sha1").update(toSign).digest("hex");

	const form = new FormData();
	form.append(
		"file",
		new Blob([file.buffer], { type: file.mimetype }),
		file.originalname,
	);
	form.append("api_key", env.cloudinary.apiKey);
	form.append("timestamp", String(timestamp));
	form.append("folder", folder);
	form.append("signature", signature);

	const res = await fetch(
		`https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/upload`,
		{ method: "POST", body: form },
	);

	if (!res.ok) {
		const text = await res.text();
		throw AppError.badRequest(`Upload failed: ${text}`);
	}

	const data = (await res.json()) as {
		secure_url: string;
		public_id: string;
		width: number;
		height: number;
		bytes: number;
	};

	return {
		url: data.secure_url,
		publicId: data.public_id,
		width: data.width,
		height: data.height,
		bytes: data.bytes,
		originalName: file.originalname,
	};
}
