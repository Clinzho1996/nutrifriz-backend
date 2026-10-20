import { Document, Model, Schema, Types, model } from "mongoose";

export interface IJournalCategory extends Document {
	_id: Types.ObjectId;
	slug: string;
	name: string;
	description: string;
	order: number;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const JournalCategorySchema = new Schema<IJournalCategory>(
	{
		slug: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
			index: true,
		},
		name: { type: String, required: true, trim: true, index: true },
		description: { type: String, default: "", maxlength: 300 },
		order: { type: Number, default: 0, index: true },
		isActive: { type: Boolean, default: true, index: true },
	},
	{ timestamps: true },
);

export const JournalCategory: Model<IJournalCategory> = model<IJournalCategory>(
	"JournalCategory",
	JournalCategorySchema,
);
