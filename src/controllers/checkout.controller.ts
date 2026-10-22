import { Request, Response } from "express";
import { IOrder } from "../models/Order";
import * as orderService from "../services/order.service";
import { verifyTransaction } from "../services/paystack.service";
import { created } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const initCheckout = asyncHandler(
	async (req: Request, res: Response) => {
		const userId = String(req.user!._id);
		const { order, paymentLink } = await orderService.createPendingOrder(
			userId,
			(req.user as any).email,
			req.body,
		);

		const isPaystack = req.body.paymentMethod === "paystack";

		return created(
			res,
			{
				orderId: order._id,
				orderNumber: order.orderNumber,
				reference: order.payment.reference,
				total: order.total,
				paymentMethod: req.body.paymentMethod,
				// Present only for Paystack
				paymentLink: isPaystack ? paymentLink : undefined,
				// Present only for bank transfer
				bankDetails: !isPaystack
					? {
							bank: "Opay",
							accountNumber: "6427368778",
							accountName: "Nutrifriz Limited",
						}
					: undefined,
				whatsappUrl: !isPaystack ? buildWhatsAppUrl(order) : undefined,
			},
			isPaystack
				? "Order created — redirecting to Paystack"
				: "Order created — proceed with bank transfer",
		);
	},
);

function buildWhatsAppUrl(order: any): string {
	const phone = "2349072300904";
	const amount = order.total.toLocaleString("en-NG");
	const items = order.items
		.map((i: any) => `• ${i.name} × ${i.qty}`)
		.join("\n");
	const message =
		`Hello Nutrifriz! I've made a bank transfer for my order.\n\n` +
		`Order: ${order.orderNumber}\n` +
		`Amount: ₦${amount}\n\n` +
		`Items:\n${items}\n\n` +
		`I'll attach my payment receipt here. Thank you!`;
	return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

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
function ok(
	res: Response<any, Record<string, any>>,
	arg1: {
		paystack: { status: any; amount: any; currency: any };
		order: IOrder | null;
	},
): unknown {
	return res.status(200).json({
		success: true,
		data: arg1,
	});
}
