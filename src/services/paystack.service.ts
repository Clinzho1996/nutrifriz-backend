import axios, { AxiosInstance } from "axios";
import crypto from "crypto";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { logger } from "../config/logger";

interface InitResponse {
	authorization_url: string;
	access_code: string;
	reference: string;
}

interface VerifyResponse {
	status: boolean;
	message: string;
	data: {
		reference: string;
		status:
			| "success"
			| "failed"
			| "abandoned"
			| "ongoing"
			| "pending"
			| "reversed";
		amount: number;
		currency: string;
		paid_at?: string;
		customer: { email: string };
		metadata?: Record<string, unknown>;
		[k: string]: unknown;
	};
}

const client: AxiosInstance = axios.create({
	baseURL: env.paystack.baseUrl,
	headers: {
		Authorization: `Bearer ${env.paystack.secretKey}`,
		"Content-Type": "application/json",
	},
	timeout: 15_000,
});

export async function initializeTransaction(params: {
	email: string;
	amountNaira: number;
	reference: string;
	metadata?: Record<string, unknown>;
	callbackUrl?: string;
}): Promise<InitResponse> {
	const amountKobo = Math.round(params.amountNaira * 100);
	try {
		const { data } = await client.post("/transaction/initialize", {
			email: params.email,
			amount: amountKobo,
			reference: params.reference,
			metadata: params.metadata ?? {},
			callback_url:
				params.callbackUrl ?? `${env.storefrontUrl}/checkout/verify`,
		});
		if (!data?.status)
			throw AppError.internal("Paystack initialization failed");
		return data.data as InitResponse;
	} catch (err: any) {
		logger.error(
			{ err: err?.response?.data ?? err?.message },
			"Paystack init failed",
		);
		throw AppError.badRequest(
			err?.response?.data?.message ?? "Could not initialize payment",
		);
	}
}

export async function verifyTransaction(
	reference: string,
): Promise<VerifyResponse["data"]> {
	try {
		const { data } = await client.get<VerifyResponse>(
			`/transaction/verify/${reference}`,
		);
		if (!data?.status)
			throw AppError.badRequest(data?.message ?? "Verification failed");
		return data.data;
	} catch (err: any) {
		logger.error(
			{ err: err?.response?.data ?? err?.message },
			"Paystack verify failed",
		);
		throw AppError.badRequest("Could not verify payment");
	}
}

export async function refundTransaction(params: {
	reference: string;
	amountNaira?: number;
	reason?: string;
}) {
	try {
		const body: Record<string, unknown> = { transaction: params.reference };
		if (params.amountNaira) body.amount = Math.round(params.amountNaira * 100);
		if (params.reason) body.merchant_note = params.reason;

		const { data } = await client.post("/refund", body);
		return data.data;
	} catch (err: any) {
		logger.error(
			{ err: err?.response?.data ?? err?.message },
			"Paystack refund failed",
		);
		throw AppError.badRequest("Could not process refund");
	}
}

export function verifyWebhookSignature(
	rawBody: Buffer | string,
	signature: string,
): boolean {
	const hash = crypto
		.createHmac("sha512", env.paystack.secretKey)
		.update(rawBody)
		.digest("hex");
	return hash === signature;
}
