import { Document, Model, Schema, Types, model } from "mongoose";

export interface IJournalPost extends Document {
	_id: Types.ObjectId;
	slug: string;
	title: string;
	excerpt: string;
	body: string;
	category: string;
	coverImage: string;
	seo: { title?: string; description?: string };
	relatedProductIds: Types.ObjectId[];
	tags: string[];
	status: "draft" | "published" | "archived";
	publishedAt?: Date;
	authorId?: Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
}

const JournalPostSchema = new Schema<IJournalPost>(
	{
		slug: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			index: true,
		},
		title: { type: String, required: true, trim: true },
		excerpt: { type: String, required: true, maxlength: 300 },
		body: { type: String, required: true },
		category: {
			type: String,
			required: true,
			trim: true,
			index: true,
			// Stores the slug of a JournalCategory, e.g. "food-and-everyday-living"
		},
		coverImage: { type: String, default: "" },
		seo: {
			title: { type: String, trim: true },
			description: { type: String, trim: true, maxlength: 200 },
		},
		relatedProductIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
		tags: { type: [String], default: [], index: true },
		status: {
			type: String,
			enum: ["draft", "published", "archived"],
			default: "draft",
			index: true,
		},
		publishedAt: Date,
		authorId: { type: Schema.Types.ObjectId, ref: "User" },
	},
	{ timestamps: true },
);

JournalPostSchema.index({
	title: "text",
	excerpt: "text",
	body: "text",
	tags: "text",
});

export const JournalPost: Model<IJournalPost> = model<IJournalPost>(
	"JournalPost",
	JournalPostSchema,
);
