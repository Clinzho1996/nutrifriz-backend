import { Request, Response } from "express";
import * as customerService from "../services/customer.service";
import { ok, paginated } from "../utils/apiResponse";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { importOptionsSchema } from "../validators/customer.validator";

export const list = asyncHandler(async (req: Request, res: Response) => {
	const query = req.query as any;
	const result = await customerService.listCustomers(query);
	return paginated(res, result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
	const result = await customerService.getCustomerById(req.params.id);
	return ok(res, result);
});

export const exportCsv = asyncHandler(async (req: Request, res: Response) => {
	const query = req.query as any;
	const csv = await customerService.exportCustomersCsv(query);

	const filename = `nutrifriz-customers-${new Date().toISOString().slice(0, 10)}.csv`;
	res.setHeader("Content-Type", "text/csv; charset=utf-8");
	res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
	res.setHeader("Cache-Control", "no-store");
	res.status(200).send(csv);
});

export const importCsv = asyncHandler(async (req: Request, res: Response) => {
	const file = (req as any).file as Express.Multer.File | undefined;
	if (!file) throw AppError.badRequest("No CSV file uploaded");

	const options = importOptionsSchema.parse(req.body ?? {});
	const raw = file.buffer.toString("utf8");

	const result = await customerService.importCustomersCsv(
		raw,
		options,
		String(req.user!._id),
	);

	return ok(res, result, "Import complete");
});

export const importTemplate = asyncHandler(
	async (_req: Request, res: Response) => {
		const template =
			"email,firstName,lastName,phone\n" +
			"jane@example.com,Jane,Doe,08030000000\n" +
			"ahmed@example.com,Ahmed,Yusuf,08031234567\n";
		res.setHeader("Content-Type", "text/csv; charset=utf-8");
		res.setHeader(
			"Content-Disposition",
			'attachment; filename="nutrifriz-customers-template.csv"',
		);
		res.status(200).send(template);
	},
);
