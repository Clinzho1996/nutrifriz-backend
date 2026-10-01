import { Document, Model, Schema, Types, model } from "mongoose";

export type B2BBusinessType =
	| "retailer"
	| "wholesale"
	| "restaurant"
	| "chef"
	| "hotel"
	| "manufacturer"
	| "corporate-gifting"
	| "ingredient"
	| "partnership"
	| "other";

export interface IB2BLead extends Document {
	_id: Types.ObjectId;
	company: string;
	businessType: B2BBusinessType;
	contactName: string;
	email: string;
	phone: string;
	location: string;
	interest: string;
	estimatedQuantity?: string;
	message?: string;
	status: "new" | "contacted" | "qualified" | "won" | "lost";
	assignedTo?: Types.ObjectId;
	notes: { body: string; by?: Types.ObjectId; at: Date }[];
	createdAt: Date;
	updatedAt: Date;
}

const B2BLeadSchema = new Schema<IB2BLead>(
	{
		company: { type: String, required: true, trim: true },
		businessType: {
			type: String,
			enum: [
				"retailer",
				"wholesale",
				"restaurant",
				"chef",
				"hotel",
				"manufacturer",
				"corporate-gifting",
				"ingredient",
				"partnership",
				"other",
			],
			required: true,
			index: true,
		},
		contactName: { type: String, required: true, trim: true },
		email: {
			type: String,
			required: true,
			lowercase: true,
			trim: true,
			index: true,
		},
		phone: { type: String, required: true, trim: true },
		location: { type: String, required: true, trim: true },
		interest: { type: String, required: true, trim: true },
		estimatedQuantity: { type: String, trim: true },
		message: { type: String, maxlength: 2000 },
		status: {
			type: String,
			enum: ["new", "contacted", "qualified", "won", "lost"],
			default: "new",
			index: true,
		},
		assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
		notes: [
			{
				body: { type: String, required: true },
				by: { type: Schema.Types.ObjectId, ref: "User" },
				at: { type: Date, default: () => new Date() },
			},
		],
	},
	{ timestamps: true },
);

export const B2BLead: Model<IB2BLead> = model<IB2BLead>(
	"B2BLead",
	B2BLeadSchema,
);
