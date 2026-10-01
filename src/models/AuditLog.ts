import { Document, Model, Schema, Types, model } from "mongoose";

export interface IAuditLog extends Document {
	_id: Types.ObjectId;
	actorId?: Types.ObjectId;
	action: string;
	entity: string;
	entityId?: string;
	before?: unknown;
	after?: unknown;
	ip?: string;
	userAgent?: string;
	at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
	{
		actorId: { type: Schema.Types.ObjectId, ref: "User", index: true },
		action: { type: String, required: true, index: true },
		entity: { type: String, required: true, index: true },
		entityId: { type: String, index: true },
		before: { type: Schema.Types.Mixed },
		after: { type: Schema.Types.Mixed },
		ip: String,
		userAgent: String,
		at: { type: Date, default: () => new Date(), index: true },
	},
	{ timestamps: false },
);

AuditLogSchema.index({ entity: 1, entityId: 1, at: -1 });

export const AuditLog: Model<IAuditLog> = model<IAuditLog>(
	"AuditLog",
	AuditLogSchema,
);
