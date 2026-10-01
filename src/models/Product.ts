import { Document, Model, Schema, Types, model } from "mongoose";
import { ProductStatus } from "../types";

export interface IPackSize {
	size: "30g" | "50g" | "100g" | string;
	price: number;
	sku: string;
	stock: number;
}

export interface INutrition {
	calories: number;
	protein: number;
	carbs: number;
	sugar: number;
	fibre: number;
	fat: number;
}

export interface IProduct extends Document {
	_id: Types.ObjectId;
	slug: string;
	name: string;
	category: "fruit" | "mix" | "collection" | "gift";
	fruit?: string;
	shortDescription: string;
	description: string;
	images: string[];
	packSizes: IPackSize[];
	ingredients: string[];
	nutrition?: INutrition;
	storage?: string;
	shelfLife?: string;
	shippingInfo?: string;
	status: ProductStatus;
	ratingAvg: number;
	ratingCount: number;
	isBuildYourMixEligible: boolean;
	isFeatured: boolean;
	tags: string[];
	createdAt: Date;
	updatedAt: Date;
}

const PackSizeSchema = new Schema<IPackSize>(
	{
		size: { type: String, required: true },
		price: { type: Number, required: true, min: 0 },
		sku: { type: String, required: true, trim: true },
		stock: { type: Number, required: true, min: 0, default: 0 },
	},
	{ _id: false },
);

const NutritionSchema = new Schema<INutrition>(
	{
		calories: { type: Number, default: 0 },
		protein: { type: Number, default: 0 },
		carbs: { type: Number, default: 0 },
		sugar: { type: Number, default: 0 },
		fibre: { type: Number, default: 0 },
		fat: { type: Number, default: 0 },
	},
	{ _id: false },
);

const ProductSchema = new Schema<IProduct>(
	{
		slug: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			index: true,
		},
		name: { type: String, required: true, trim: true, index: true },
		category: {
			type: String,
			enum: ["fruit", "mix", "collection", "gift"],
			required: true,
			index: true,
		},
		fruit: { type: String, trim: true, index: true },
		shortDescription: {
			type: String,
			required: true,
			trim: true,
			maxlength: 240,
		},
		description: { type: String, required: true },
		images: { type: [String], default: [] },
		packSizes: { type: [PackSizeSchema], default: [] },
		ingredients: { type: [String], default: [] },
		nutrition: { type: NutritionSchema },
		storage: { type: String },
		shelfLife: { type: String },
		shippingInfo: { type: String },
		status: {
			type: String,
			enum: ["draft", "published", "archived"],
			default: "draft",
			index: true,
		},
		ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
		ratingCount: { type: Number, default: 0, min: 0 },
		isBuildYourMixEligible: { type: Boolean, default: false, index: true },
		isFeatured: { type: Boolean, default: false, index: true },
		tags: { type: [String], default: [], index: true },
	},
	{ timestamps: true },
);

ProductSchema.index({ name: "text", shortDescription: "text", tags: "text" });

export const Product: Model<IProduct> = model<IProduct>(
	"Product",
	ProductSchema,
);
