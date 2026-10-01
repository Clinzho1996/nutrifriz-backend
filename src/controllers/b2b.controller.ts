import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created, paginated } from "../utils/apiResponse";
import * as b2bService from "../services/b2b.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
	const lead = await b2bService.createLead(req.body);
	return created(res, lead, "Enquiry received. We will be in touch.");
});

export const list = asyncHandler(async (req: Request, res: Response) => {
	const query = req.query as any;
	const result = await b2bService.listLeads(query);
	return paginated(res, result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
	const lead = await b2bService.getLeadById(req.params.id);
	return ok(res, lead);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
	const lead = await b2bService.updateLead(req.params.id, req.body);
	return ok(res, lead, "Lead updated");
});

export const addNote = asyncHandler(async (req: Request, res: Response) => {
	const lead = await b2bService.addNote(
		req.params.id,
		req.body.body,
		String(req.user!._id),
	);
	return ok(res, lead, "Note added");
});
