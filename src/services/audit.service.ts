import { Types } from "mongoose";
import { AuditLog } from "../models/AuditLog";
import { logger } from "../config/logger";

interface AuditInput {
	actorId?: string | Types.ObjectId;
	action: string;
	entity: string;
	entityId?: string;
	before?: unknown;
	after?: unknown;
	ip?: string;
	userAgent?: string;
}

export async function recordAudit(input: AuditInput): Promise<void> {
	try {
		await AuditLog.create({
			actorId: input.actorId,
			action: input.action,
			entity: input.entity,
			entityId: input.entityId,
			before: input.before,
			after: input.after,
			ip: input.ip,
			userAgent: input.userAgent,
			at: new Date(),
		});
	} catch (err) {
		logger.error({ err }, "Failed to record audit log");
	}
}
