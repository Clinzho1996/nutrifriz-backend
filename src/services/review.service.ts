import { Types } from "mongoose";
import { Review, IReview } from "../models/Review";
import { Order } from "../models/Order";
import { AppError } from "../utils/AppError";
import { CreateReviewInput } from "../validators/review.validator";
import { recalcProductRating } from "./product.service";
import { recordAudit } from "./audit.service";

export async function createReview(
	userId: string,
	input: CreateReviewInput,
): Promise<IReview> {
	const already = await Review.findOne({ userId, productId: input.productId });
	if (already)
		throw AppError.conflict("You have already reviewed this product");

	// Determine verified purchase
	const purchased = await Order.findOne({
		userId,
		status: { $in: ["paid", "processing", "shipped", "delivered"] },
		"items.refId": new Types.ObjectId(input.productId),
	}).lean();

	const review = await Review.create({
		userId,
		productId: input.productId,
		orderId: input.orderId ?? purchased?._id,
		rating: input.rating,
		title: input.title,
		body: input.body,
		photos: input.photos ?? [],
		verifiedPurchase: Boolean(purchased),
		status: "pending",
	});

	await recordAudit({
		actorId: userId,
		action: "review.create",
		entity: "Review",
		entityId: String(review._id),
	});

	return review;
}

export async function listReviews(query: {
	page: number;
	limit: number;
	status?: "pending" | "approved" | "rejected";
	productId?: string;
}) {
	const filter: Record<string, unknown> = {};
	if (query.status) filter.status = query.status;
	if (query.productId) filter.productId = new Types.ObjectId(query.productId);

	const [items, total] = await Promise.all([
		Review.find(filter)
			.sort({ createdAt: -1 })
			.skip((query.page - 1) * query.limit)
			.limit(query.limit)
			.populate("userId", "firstName lastName email")
			.populate("productId", "name slug")
			.lean(),
		Review.countDocuments(filter),
	]);

	return {
		items,
		total,
		page: query.page,
		limit: query.limit,
		pages: Math.ceil(total / query.limit),
	};
}

export async function listApprovedForProduct(productId: string) {
	return Review.find({ productId, status: "approved" })
		.sort({ createdAt: -1 })
		.populate("userId", "firstName lastName")
		.lean();
}

export async function moderateReview(
	id: string,
	status: "approved" | "rejected",
	actorId?: string,
) {
	const review = await Review.findById(id);
	if (!review) throw AppError.notFound("Review not found");

	review.status = status;
	await review.save();
	await recalcProductRating(String(review.productId));

	await recordAudit({
		actorId,
		action: "review.moderate",
		entity: "Review",
		entityId: String(review._id),
		after: { status },
	});

	return review;
}

export async function deleteReview(id: string, actorId?: string) {
	const review = await Review.findById(id);
	if (!review) throw AppError.notFound("Review not found");
	const productId = review.productId;
	await review.deleteOne();
	await recalcProductRating(String(productId));
	await recordAudit({
		actorId,
		action: "review.delete",
		entity: "Review",
		entityId: id,
	});
}
