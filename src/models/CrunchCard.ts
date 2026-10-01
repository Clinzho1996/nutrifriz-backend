import { Document, Model, Schema, Types, model } from "mongoose";

export interface ICrunchCard extends Document {
	_id: Types.ObjectId;
	cardCode: string;
	seriesId: Types.ObjectId;
	numberInSeries: number;
	fruit: string;
	fact: string;
	challenge?: string;
	registeredBy?: Types.ObjectId;
	registeredAt?: Date;
	status: "issued" | "registered" | "retired";
	createdAt: Date;
	updatedAt: Date;
}

const CrunchCardSchema = new Schema<ICrunchCard>(
	{
		cardCode: {
			type: String,
			required: true,
			unique: true,
			uppercase: true,
			trim: true,
			index: true,
		},
		seriesId: {
			type: Schema.Types.ObjectId,
			ref: "CardSeries",
			required: true,
			index: true,
		},
		numberInSeries: { type: Number, required: true, min: 1 },
		fruit: { type: String, required: true, trim: true },
		fact: { type: String, required: true },
		challenge: { type: String },
		registeredBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
		registeredAt: Date,
		status: {
			type: String,
			enum: ["issued", "registered", "retired"],
			default: "issued",
			index: true,
		},
	},
	{ timestamps: true },
);

CrunchCardSchema.index({ seriesId: 1, numberInSeries: 1 }, { unique: true });

export const CrunchCard: Model<ICrunchCard> = model<ICrunchCard>(
	"CrunchCard",
	CrunchCardSchema,
);
