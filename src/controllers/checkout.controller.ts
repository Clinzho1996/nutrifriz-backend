import { Request, Response } from "express";
import { User } from "../models/User";
import { verifyTransaction } from "../services/flutterwave.service";
import * as orderService from "../services/order.service";
import { created, ok } from "../utils/apiResponse";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

export const initCheckout = asyncHandler(
	async (req: Request, res: Response) => {
		const userId = String(req.user!._id);

		// Look up the user to get their email — required for Flutterwave
		const user = await User.findById(userId).lean();
		if (!user) throw AppError.unauthorized("User not found");
		if (!user.email) throw AppError.badRequest("User has no email on file");

		const { order, paymentLink } = await orderService.createPendingOrder(
			userId,
			user.email,
			req.body,
		);

		return created(
			res,
			{
				orderId: order._id,
				orderNumber: order.orderNumber,
				reference: order.payment.reference,
				total: order.total,
				paymentLink,
			},
			"Checkout initialized",
		);
	},
);

export const verifyCheckout = asyncHandler(
	async (req: Request, res: Response) => {
		const { reference } = req.params;
		const data = await verifyTransaction(reference);

		let order = null;
		if (data.status === "successful") {
			order = await orderService.markOrderPaid(reference, data as any);
		} else if (data.status === "failed") {
			await orderService.markOrderFailed(reference, data as any);
		}

		return ok(res, {
			flutterwave: {
				status: data.status,
				amount: data.amount,
				currency: data.currency,
				flwRef: data.flw_ref,
			},
			order,
		});
	},
);
