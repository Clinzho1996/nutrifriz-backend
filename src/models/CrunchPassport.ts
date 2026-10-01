import { Document, Model, Schema, Types, model } from "mongoose";

export interface ICrunchPassport extends Document {
	_id: Types.ObjectId;
	userId: Types.ObjectId;
	seriesId: Types.ObjectId;
	cardIds: Types.ObjectId[];
	points: number;
	rewardsClaimed: { rewardId: string; claimedAt: Date }[];
	createdAt: Date;
	updatedAt: Date;
}

const CrunchPassportSchema = new Schema<ICrunchPassport>(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		seriesId: {
			type: Schema.Types.ObjectId,
			ref: "CardSeries",
			required: true,
			index: true,
		},
		cardIds: [{ type: Schema.Types.ObjectId, ref: "CrunchCard" }],
		points: { type: Number, default: 0, min: 0 },
		rewardsClaimed: [
			{
				rewardId: { type: String, required: true },
				claimedAt: { type: Date, default: () => new Date() },
			},
		],
	},
	{ timestamps: true },
);

CrunchPassportSchema.index({ userId: 1, seriesId: 1 }, { unique: true });

export const CrunchPassport: Model<ICrunchPassport> = model<ICrunchPassport>(
	"CrunchPassport",
	CrunchPassportSchema,
);
