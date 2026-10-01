import { Document, Model, Schema, Types, model } from "mongoose";

export interface IMixRule extends Document {
	_id: Types.ObjectId;
	packSize: string;
	minFruits: number;
	maxFruits: number;
	minGramsPerFruit: number;
	pricePerGram: number;
	totalGrams: number;
	allowedFruitIds: Types.ObjectId[];
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const MixRuleSchema = new Schema<IMixRule>(
	{
		packSize: { type: String, required: true, unique: true, index: true },
		minFruits: { type: Number, required: true, min: 1 },
		maxFruits: { type: Number, required: true, min: 1 },
		minGramsPerFruit: { type: Number, required: true, min: 1 },
		pricePerGram: { type: Number, required: true, min: 0 },
		totalGrams: { type: Number, required: true, min: 1 },
		allowedFruitIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true },
);

export const MixRule: Model<IMixRule> = model<IMixRule>(
	"MixRule",
	MixRuleSchema,
);
