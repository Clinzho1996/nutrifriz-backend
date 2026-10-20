import { Types } from "mongoose";
import { Order } from "../models/Order";
import { IReview, Review } from "../models/Review";
import { AppError } from "../utils/AppError";
import { CreateReviewInput } from "../validators/review.validator";
import { recordAudit } from "./audit.service";
import { recalcProductRating } from "./product.service";

/**
 * Determine whether a user is eligible to review a given product.
 *
 * A user is eligible if:
 *  1. They have at least one PAID order (paid / processing / shipped / delivered)
 *     containing that product line, AND
 *  2. They have not already submitted a review for it.
 */
export async function canReviewProduct(
	userId: string,
	productId: string,
): Promise<{ eligible: boolean; reason?: string }> {
	const already = await Review.findOne({ userId, productId });
	if (already) {
		return {
			eligible: false,
			reason: "You have already reviewed this product.",
		};
	}

	const purchased = await Order.findOne({
		userId: new Types.ObjectId(userId),
		status: { $in: ["paid", "processing", "shipped", "delivered"] },
		"items.refId": new Types.ObjectId(productId),
	}).lean();

	if (!purchased) {
		return {
			eligible: false,
			reason: "Only customers who have purchased this product can review it.",
		};
	}

	return { eligible: true };
}

export async function createReview(
	userId: string,
	input: CreateReviewInput,
): Promise<IReview> {
	// Check eligibility (purchase + not already reviewed)
	const check = await canReviewProduct(userId, input.productId);
	if (!check.eligible) {
		throw AppError.forbidden(check.reason ?? "You cannot review this product.");
	}

	// Fetch the matching paid order to link the review and mark it verified
	const purchasedOrder = await Order.findOne({
		userId: new Types.ObjectId(userId),
		status: { $in: ["paid", "processing", "shipped", "delivered"] },
		"items.refId": new Types.ObjectId(input.productId),
	})
		.sort({ createdAt: -1 })
		.lean();

	const review = await Review.create({
		userId,
		productId: input.productId,
		orderId: input.orderId ?? purchasedOrder?._id,
		rating: input.rating,
		title: input.title,
		body: input.body,
		photos: input.photos ?? [],
		verifiedPurchase: true, // guaranteed by the check above
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
