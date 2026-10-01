import { FilterQuery } from "mongoose";
import { B2BLead, IB2BLead } from "../models/B2BLead";
import { Types } from "mongoose";
import { AppError } from "../utils/AppError";
import { CreateB2BLeadInput } from "../validators/b2b.validator";
import { recordAudit } from "./audit.service";

export async function createLead(input: CreateB2BLeadInput): Promise<IB2BLead> {
	const lead = await B2BLead.create({ ...input, status: "new" });
	await recordAudit({
		action: "b2b.lead.create",
		entity: "B2BLead",
		entityId: String(lead._id),
	});
	return lead;
}

export async function listLeads(query: {
	page: number;
	limit: number;
	status?: string;
	businessType?: string;
	q?: string;
}) {
	const filter: FilterQuery<IB2BLead> = {};
	if (query.status) filter.status = query.status;
	if (query.businessType) filter.businessType = query.businessType;
	if (query.q)
		filter.$or = [
			{ company: new RegExp(query.q, "i") },
			{ email: new RegExp(query.q, "i") },
			{ contactName: new RegExp(query.q, "i") },
		];

	const [items, total] = await Promise.all([
		B2BLead.find(filter)
			.sort({ createdAt: -1 })
			.skip((query.page - 1) * query.limit)
			.limit(query.limit)
			.lean(),
		B2BLead.countDocuments(filter),
	]);

	return {
		items,
		total,
		page: query.page,
		limit: query.limit,
		pages: Math.ceil(total / query.limit),
	};
}

export async function getLeadById(id: string) {
	const lead = await B2BLead.findById(id).lean();
	if (!lead) throw AppError.notFound("Lead not found");
	return lead;
}

export async function updateLead(
	id: string,
	input: { status?: string; assignedTo?: string },
) {
	const lead = await B2BLead.findById(id);
	if (!lead) throw AppError.notFound("Lead not found");

	if (input.status) lead.status = input.status as IB2BLead["status"];
	if (input.assignedTo) lead.assignedTo = new Types.ObjectId(input.assignedTo);
	await lead.save();
	return lead;
}

export async function addNote(id: string, body: string, actorId?: string) {
	const lead = await B2BLead.findById(id);
	if (!lead) throw AppError.notFound("Lead not found");
	lead.notes.push({
		body,
		by: actorId ? new Types.ObjectId(actorId) : undefined,
		at: new Date(),
	});
	await lead.save();
	return lead;
}
