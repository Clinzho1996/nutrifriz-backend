import { Request, Response } from "express";
import { verifyWebhookSignature } from "../services/paystack.service";
import * as orderService from "../services/order.service";
import { logger } from "../config/logger";

export async function paystackWebhook(
	req: Request,
	res: Response,
): Promise<void> {
	const signature = req.headers["x-paystack-signature"] as string | undefined;
	const rawBody = (req as any).rawBody as Buffer | undefined;

	if (!signature || !rawBody) {
		logger.warn("Paystack webhook missing signature or raw body");
		res.sendStatus(400);
		return;
	}

	if (!verifyWebhookSignature(rawBody, signature)) {
		logger.warn("Paystack webhook signature mismatch");
		res.sendStatus(401);
		return;
	}

	let event: { event: string; data: any };
	try {
		event = JSON.parse(rawBody.toString("utf8"));
	} catch (err) {
		logger.error({ err }, "Invalid webhook JSON");
		res.sendStatus(400);
		return;
	}

	try {
		switch (event.event) {
			case "charge.success":
				await orderService.markOrderPaid(event.data.reference, event.data);
				break;
			case "charge.failed":
				await orderService.markOrderFailed(event.data.reference, event.data);
				break;
			default:
				logger.debug({ event: event.event }, "Unhandled Paystack event");
		}
		res.sendStatus(200);
	} catch (err) {
		logger.error({ err, event: event.event }, "Webhook handler error");
		res.sendStatus(500);
	}
}
