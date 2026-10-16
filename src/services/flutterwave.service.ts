import axios, { AxiosInstance } from "axios";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { AppError } from "../utils/AppError";

interface InitResponse {
	status: string;
	message: string;
	data: {
		link: string;
	};
}

interface VerifyResponse {
	status: string;
	message: string;
	data: {
		id: number;
		tx_ref: string;
		flw_ref: string;
		amount: number;
		currency: string;
		status: string; // 'successful' | 'failed' | 'pending'
		customer: { email: string; name?: string; phone_number?: string };
		created_at: string;
		[k: string]: unknown;
	};
}

const client: AxiosInstance = axios.create({
	baseURL: env.flutterwave.baseUrl,
	headers: {
		Authorization: `Bearer ${env.flutterwave.secretKey}`,
		"Content-Type": "application/json",
	},
	timeout: 15_000,
});

/**
 * Initialize a Flutterwave payment. Returns a hosted link the customer is
 * redirected to. Amount is in the MAIN currency unit (NGN 5000 = 5000), NOT
 * kobo/cents. This is a common Flutterwave gotcha.
 */
export async function initializePayment(params: {
	email: string;
	amountNaira: number;
	reference: string;
	metadata?: Record<string, unknown>;
	redirectUrl?: string;
}): Promise<{ link: string; reference: string }> {
	try {
		const { data } = await client.post<InitResponse>("/payments", {
			tx_ref: params.reference,
			amount: params.amountNaira,
			currency: "NGN",
			redirect_url: params.redirectUrl ?? env.flutterwave.redirectUrl,
			customer: {
				email: params.email,
			},
			customizations: {
				title: "Nutrifriz",
				description: "Freeze-dried fruit order",
				logo: "https://nutrifriz.com/logo.png",
			},
			meta: params.metadata ?? {},
		});

		if (data.status !== "success" || !data.data?.link) {
			throw AppError.internal("Flutterwave initialization failed");
		}

		return { link: data.data.link, reference: params.reference };
	} catch (err: any) {
		logger.error(
			{ err: err?.response?.data ?? err?.message },
			"Flutterwave init failed",
		);
		throw AppError.badRequest(
			err?.response?.data?.message ?? "Could not initialize payment",
		);
	}
}

/**
 * Verify a transaction by its tx_ref (the reference we generated).
 * Flutterwave v3 supports verifying by tx_ref directly.
 */
export async function verifyTransaction(
	reference: string,
): Promise<VerifyResponse["data"]> {
	try {
		const { data } = await client.get<VerifyResponse>(
			`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
		);

		if (data.status !== "success" || !data.data) {
			throw AppError.badRequest(data?.message ?? "Verification failed");
		}
		return data.data;
	} catch (err: any) {
		logger.error(
			{ err: err?.response?.data ?? err?.message },
			"Flutterwave verify failed",
		);
		throw AppError.badRequest("Could not verify payment");
	}
}

/**
 * Webhook signature check. Flutterwave sends `verif-hash` header; compare it
 * to the secret hash set in the dashboard. This is a plain-string compare,
 * not HMAC. Simpler than Paystack's HMAC-SHA512.
 */
export function verifyWebhookSignature(signature: string | undefined): boolean {
	if (!signature) return false;
	return signature === env.flutterwave.webhookSecretHash;
}
