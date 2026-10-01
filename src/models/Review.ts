import { Document, Model, Schema, Types, model } from "mongoose";
import { ReviewStatus } from "../types";

export interface IReview extends Document {
	_id: Types.ObjectId;
	productId: Types.ObjectId;
	userId: Types.ObjectId;
	orderId?: Types.ObjectId;
	rating: number;
	title?: string;
	body: string;
	photos: string[];
	verifiedPurchase: boolean;
	status: ReviewStatus;
	createdAt: Date;
	updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
	{
		productId: {
			type: Schema.Types.ObjectId,
			ref: "Product",
			required: true,
			index: true,
		},
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		orderId: { type: Schema.Types.ObjectId, ref: "Order" },
		rating: { type: Number, required: true, min: 1, max: 5 },
		title: { type: String, trim: true, maxlength: 120 },
		body: { type: String, required: true, trim: true, maxlength: 2000 },
		photos: { type: [String], default: [] },
		verifiedPurchase: { type: Boolean, default: false },
		status: {
			type: String,
			enum: ["pending", "approved", "rejected"],
			default: "pending",
			index: true,
		},
	},
	{ timestamps: true },
);

ReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, productId: 1 }, { unique: false });

export const Review: Model<IReview> = model<IReview>("Review", ReviewSchema);
