import { Request, Response } from "express";
import { logger } from "../config/logger";
import { verifyWebhookSignature } from "../services/flutterwave.service";
import * as orderService from "../services/order.service";

export async function flutterwaveWebhook(
	req: Request,
	res: Response,
): Promise<void> {
	const signature = req.headers["verif-hash"] as string | undefined;

	if (!verifyWebhookSignature(signature)) {
		logger.warn("Flutterwave webhook signature mismatch");
		res.sendStatus(401);
		return;
	}

	const event = req.body as {
		event?: string;
		data?: { tx_ref?: string; status?: string; [k: string]: unknown };
	};

	try {
		const eventName = event.event;
		const reference = event.data?.tx_ref;

		switch (eventName) {
			case "charge.completed":
				if (event.data?.status === "successful" && reference) {
					await orderService.markOrderPaid(reference, event.data);
					logger.info({ reference }, "Flutterwave charge completed");
				} else if (reference) {
					await orderService.markOrderFailed(reference, event.data);
				}
				break;

			case "charge.failed":
				if (reference) {
					await orderService.markOrderFailed(reference, event.data);
				}
				break;

			default:
				logger.debug({ event: eventName }, "Unhandled Flutterwave event");
		}

		// Must respond 200 or Flutterwave retries (up to 3× with 30-min gaps)
		res.sendStatus(200);
	} catch (err) {
		logger.error(
			{ err, event: event.event },
			"Flutterwave webhook handler error",
		);
		res.sendStatus(500);
	}
}
