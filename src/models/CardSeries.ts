import { Document, Model, Schema, Types, model } from "mongoose";

export interface ICardSeries extends Document {
	_id: Types.ObjectId;
	code: string;
	name: string;
	description: string;
	totalCards: number;
	status: "draft" | "active" | "retired";
	createdAt: Date;
	updatedAt: Date;
}

const CardSeriesSchema = new Schema<ICardSeries>(
	{
		code: {
			type: String,
			required: true,
			unique: true,
			uppercase: true,
			trim: true,
			index: true,
		},
		name: { type: String, required: true, trim: true },
		description: { type: String, default: "" },
		totalCards: { type: Number, required: true, min: 1 },
		status: {
			type: String,
			enum: ["draft", "active", "retired"],
			default: "draft",
			index: true,
		},
	},
	{ timestamps: true },
);

export const CardSeries: Model<ICardSeries> = model<ICardSeries>(
	"CardSeries",
	CardSeriesSchema,
);
