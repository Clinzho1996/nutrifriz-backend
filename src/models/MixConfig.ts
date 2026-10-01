import { Document, Model, Schema, Types, model } from "mongoose";

export interface IMixFruit {
	productId: Types.ObjectId;
	grams: number;
	name: string;
}

export interface IMixConfig extends Document {
	_id: Types.ObjectId;
	userId?: Types.ObjectId;
	guestEmail?: string;
	name?: string;
	packSize: string;
	fruits: IMixFruit[];
	computedPrice: number;
	status: "cart" | "ordered" | "saved";
	createdAt: Date;
	updatedAt: Date;
}

const MixFruitSchema = new Schema<IMixFruit>(
	{
		productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
		grams: { type: Number, required: true, min: 1 },
		name: { type: String, required: true },
	},
	{ _id: false },
);

const MixConfigSchema = new Schema<IMixConfig>(
	{
		userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
		guestEmail: { type: String, lowercase: true, trim: true, index: true },
		name: { type: String, trim: true, maxlength: 60 },
		packSize: { type: String, required: true },
		fruits: { type: [MixFruitSchema], required: true },
		computedPrice: { type: Number, required: true, min: 0 },
		status: {
			type: String,
			enum: ["cart", "ordered", "saved"],
			default: "cart",
			index: true,
		},
	},
	{ timestamps: true },
);

export const MixConfig: Model<IMixConfig> = model<IMixConfig>(
	"MixConfig",
	MixConfigSchema,
);
