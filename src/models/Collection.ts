import { Document, Model, Schema, Types, model } from "mongoose";

export interface ICollectionItem {
	productId: Types.ObjectId;
	qty: number;
}

export interface ICollectionPricing {
	type: "fixed" | "sum-discount";
	amount?: number;
	discountPct?: number;
}

export interface ICollection extends Document {
	_id: Types.ObjectId;
	slug: string;
	name: string;
	occasion: string;
	description: string;
	image: string;
	items: ICollectionItem[];
	pricing: ICollectionPricing;
	status: "draft" | "published" | "archived";
	isFeatured: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const ItemSchema = new Schema<ICollectionItem>(
	{
		productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
		qty: { type: Number, required: true, min: 1, default: 1 },
	},
	{ _id: false },
);

const PricingSchema = new Schema<ICollectionPricing>(
	{
		type: {
			type: String,
			enum: ["fixed", "sum-discount"],
			required: true,
			default: "fixed",
		},
		amount: { type: Number, min: 0 },
		discountPct: { type: Number, min: 0, max: 100 },
	},
	{ _id: false },
);

const CollectionSchema = new Schema<ICollection>(
	{
		slug: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			index: true,
		},
		name: { type: String, required: true, trim: true },
		occasion: { type: String, required: true, trim: true, index: true },
		description: { type: String, required: true },
		image: { type: String, default: "" },
		items: { type: [ItemSchema], default: [] },
		pricing: { type: PricingSchema, required: true },
		status: {
			type: String,
			enum: ["draft", "published", "archived"],
			default: "draft",
			index: true,
		},
		isFeatured: { type: Boolean, default: false, index: true },
	},
	{ timestamps: true },
);

export const Collection: Model<ICollection> = model<ICollection>(
	"Collection",
	CollectionSchema,
);
