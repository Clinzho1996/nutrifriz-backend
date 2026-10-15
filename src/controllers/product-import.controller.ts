import { Request, Response } from "express";
import * as productImportService from "../services/product-import.service";
import { ok } from "../utils/apiResponse";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

export const importTemplate = asyncHandler(
	async (_req: Request, res: Response) => {
		// Header + 3 example rows. First two rows are the same product with 2 variants.
		const csv =
			"name,slug,category,fruit,shortDescription,description,size,price,sku,stock,images,ingredients,tags,storage,shelfLife,shippingInfo,status,isFeatured,isBuildYourMixEligible,calories,protein,carbs,sugar,fibre,fat\n" +
			"Freeze-Dried Mango,freeze-dried-mango,fruit,Mango,Crisp and sweet freeze-dried mango,Our freeze-dried mango keeps its natural flavour and crunch. No additives.,30g,3500,NFZ-MANGO-30,100,https://example.com/mango-1.jpg|https://example.com/mango-2.jpg,Mango,fruit|snack|vegan,Store in a cool dry place,12 months,Ships in 24 hours,draft,false,true,120,1,28,20,3,0.5\n" +
			"Freeze-Dried Mango,freeze-dried-mango,fruit,Mango,Crisp and sweet freeze-dried mango,Our freeze-dried mango keeps its natural flavour and crunch. No additives.,50g,5200,NFZ-MANGO-50,80,,,,,,,,,,,,,\n" +
			"Freeze-Dried Strawberry,freeze-dried-strawberry,fruit,Strawberry,Sweet tangy freeze-dried strawberry,Freeze-dried strawberries burst with real fruit flavour.,30g,3800,NFZ-STRAWBERRY-30,100,https://example.com/strawberry-1.jpg,Strawberry,fruit|snack|vegan,Store cool and dry,12 months,Ships in 24 hours,draft,true,true,110,1,26,18,4,0.4\n";

		res.type("text/csv; charset=utf-8");
		res.attachment("nutrifriz-products-template.csv");
		res.status(200).send(csv);
	},
);

export const importCsv = asyncHandler(async (req: Request, res: Response) => {
	const file = (req as any).file as Express.Multer.File | undefined;
	if (!file) throw AppError.badRequest("No CSV file uploaded");

	const options = {
		updateExisting: String(req.body?.updateExisting ?? "false") === "true",
		defaultStatus:
			(req.body?.defaultStatus as "draft" | "published" | "archived") ??
			"draft",
		autoCreateCategories:
			String(req.body?.autoCreateCategories ?? "false") === "true",
		actorId: String(req.user!._id),
	};

	const raw = file.buffer.toString("utf8");
	const result = await productImportService.importProductsCsv(raw, options);

	return ok(res, result, "Import complete");
});
