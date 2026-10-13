import { Document, Model, Schema, Types, model } from "mongoose";

export interface ICategory extends Document {
	_id: Types.ObjectId;
	slug: string;
	name: string;
	description: string;
	image: string;
	parentId?: Types.ObjectId;
	order: number;
	isActive: boolean;
	productCount?: number; // virtual / computed at query time
	createdAt: Date;
	updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
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
		description: { type: String, default: "", maxlength: 500 },
		image: { type: String, default: "" },
		parentId: {
			type: Schema.Types.ObjectId,
			ref: "Category",
			default: null,
			index: true,
		},
		order: { type: Number, default: 0, index: true },
		isActive: { type: Boolean, default: true, index: true },
	},
	{ timestamps: true },
);

CategorySchema.index({ parentId: 1, order: 1 });

export const Category: Model<ICategory> = model<ICategory>(
	"Category",
	CategorySchema,
);
