import { Request, Response } from "express";
import * as orderService from "../services/order.service";
import { created } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const initCheckout = asyncHandler(
	async (req: Request, res: Response) => {
		const userId = String(req.user!._id);

		const { order } = await orderService.createPendingOrder(
			userId,
			(req.user as any).email,
			req.body,
		);

		return created(
			res,
			{
				orderId: order._id,
				orderNumber: order.orderNumber,
				reference: order.payment.reference,
				total: order.total,
				// Bank details are static — the storefront also has them, but sending
				// them here lets the WhatsApp message format use them without duplication.
				bankDetails: {
					bank: "Opay",
					accountNumber: "6427368778",
					accountName: "Nutrifriz Limited",
				},
				whatsappUrl: buildWhatsAppUrl(order),
			},
			"Order created — proceed with bank transfer",
		);
	},
);

/**
 * Build the WhatsApp deep link with a prefilled message containing the
 * order summary. The customer clicks this, WhatsApp opens with the message
 * ready — they attach the receipt and hit send.
 */
function buildWhatsAppUrl(order: any): string {
	const phone = "2349072300904";
	const orderNum = order.orderNumber;
	const amount = order.total.toLocaleString("en-NG");
	const items = order.items
		.map((i: any) => `• ${i.name} × ${i.qty}`)
		.join("\n");

	const message =
		`Hello Nutrifriz! I've made a bank transfer for my order.\n\n` +
		`Order: ${orderNum}\n` +
		`Amount: ₦${amount}\n\n` +
		`Items:\n${items}\n\n` +
		`I'll attach my payment receipt here. Thank you!`;

	return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
