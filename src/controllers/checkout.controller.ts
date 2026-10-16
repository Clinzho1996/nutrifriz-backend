import { Request, Response } from "express";
import { verifyTransaction } from "../services/flutterwave.service";
import * as orderService from "../services/order.service";
import { created, ok } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

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
