import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created } from "../utils/apiResponse";
import * as orderService from "../services/order.service";
import { verifyTransaction } from "../services/paystack.service";

export const initCheckout = asyncHandler(
	async (req: Request, res: Response) => {
		const userId = req.user ? String(req.user._id) : undefined;
		const { order, paymentLink } = await orderService.createPendingOrder(
			userId,
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
		if (data.status === "success") {
			order = await orderService.markOrderPaid(reference, data as any);
		}

		return ok(res, {
			paystack: {
				status: data.status,
				amount: data.amount,
				currency: data.currency,
			},
			order,
		});
	},
);
