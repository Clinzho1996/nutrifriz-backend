import { render } from "react-email";
import { Resend } from "resend";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { OrderCancelledEmail } from "../emails/templates/order-cancelled";
import { OrderConfirmationEmail } from "../emails/templates/order-confirmation";
import { OrderDeliveredEmail } from "../emails/templates/order-delivered";
import { OrderProcessingEmail } from "../emails/templates/order-processing";
import { OrderRefundedEmail } from "../emails/templates/order-refunded";
import { OrderShippedEmail } from "../emails/templates/order-shipped";
import { PasswordResetEmail } from "../emails/templates/password-reset";
import { WelcomeEmail } from "../emails/templates/welcome";

const resend = new Resend(env.resend.apiKey);

/**
 * Send an email. Never throws — logs the error and returns null so callers
 * don't fail their primary operation (e.g. order creation) because email failed.
 */
const FROM = `${env.resend.fromName} <${env.resend.fromEmail}>`;
const REPLY_TO = env.email.replyTo;

async function sendSafe(params: {
	to: string;
	subject: string;
	html: string;
	text?: string;
}): Promise<{ id: string } | null> {
	if (!env.resend.apiKey) {
		logger.warn("RESEND_API_KEY not set — skipping email send");
		return null;
	}

	try {
		const { data, error } = await resend.emails.send({
			from: FROM,
			to: params.to,
			replyTo: REPLY_TO,
			subject: params.subject,
			html: params.html,
			text: params.text,
		});

		if (error) {
			logger.error({ error, to: params.to }, "Resend send failed");
			return null;
		}

		logger.info({ id: data?.id, to: params.to }, "Email sent");
		return data ?? null;
	} catch (err) {
		logger.error({ err, to: params.to }, "Resend threw");
		return null;
	}
}

export async function sendOrderProcessingEmail(params: {
	to: string;
	orderNumber: string;
	customerName: string;
}) {
	const html = await render(
		<OrderProcessingEmail
			orderNumber={params.orderNumber}
			customerName={params.customerName}
		/>,
	);
	return sendSafe({
		to: params.to,
		subject: `Preparing your order ${params.orderNumber}`,
		html,
	});
}

export async function sendOrderShippedEmail(params: {
	to: string;
	orderNumber: string;
	customerName: string;
	courier?: string;
	trackingNo?: string;
}) {
	const html = await render(
		<OrderShippedEmail
			orderNumber={params.orderNumber}
			customerName={params.customerName}
			courier={params.courier}
			trackingNo={params.trackingNo}
		/>,
	);
	return sendSafe({
		to: params.to,
		subject: `Order ${params.orderNumber} has shipped`,
		html,
	});
}

export async function sendOrderDeliveredEmail(params: {
	to: string;
	orderNumber: string;
	customerName: string;
}) {
	const html = await render(
		<OrderDeliveredEmail
			orderNumber={params.orderNumber}
			customerName={params.customerName}
		/>,
	);
	return sendSafe({
		to: params.to,
		subject: `Order ${params.orderNumber} delivered`,
		html,
	});
}

export async function sendOrderCancelledEmail(params: {
	to: string;
	orderNumber: string;
	customerName: string;
	reason?: string;
}) {
	const html = await render(
		<OrderCancelledEmail
			orderNumber={params.orderNumber}
			customerName={params.customerName}
			reason={params.reason}
		/>,
	);
	return sendSafe({
		to: params.to,
		subject: `Order ${params.orderNumber} cancelled`,
		html,
	});
}

export async function sendOrderRefundedEmail(params: {
	to: string;
	orderNumber: string;
	customerName: string;
	amount: number;
}) {
	const html = await render(
		<OrderRefundedEmail
			orderNumber={params.orderNumber}
			customerName={params.customerName}
			amount={params.amount}
		/>,
	);
	return sendSafe({
		to: params.to,
		subject: `Refund issued for order ${params.orderNumber}`,
		html,
	});
}

export async function sendWelcomeEmail(params: {
	to: string;
	firstName: string;
}) {
	const html = await render(<WelcomeEmail firstName={params.firstName} />);
	return sendSafe({
		to: params.to,
		subject: "Welcome to Nutrifriz",
		html,
	});
}

export async function sendOrderConfirmationEmail(params: {
	to: string;
	orderNumber: string;
	customerName: string;
	items: { name: string; qty: number; unitPrice: number }[];
	subtotal: number;
	shippingFee: number;
	total: number;
	shippingAddress: { street: string; city: string; state: string };
}) {
	const html = await render(
		<OrderConfirmationEmail
			orderNumber={params.orderNumber}
			customerName={params.customerName}
			items={params.items}
			subtotal={params.subtotal}
			shippingFee={params.shippingFee}
			total={params.total}
			shippingAddress={params.shippingAddress}
		/>,
	);
	return sendSafe({
		to: params.to,
		subject: `Order ${params.orderNumber} confirmed`,
		html,
	});
}

export async function sendPasswordResetEmail(params: {
	to: string;
	firstName: string;
	resetUrl: string;
	expiresInMinutes: number;
}) {
	const html = await render(
		<PasswordResetEmail
			firstName={params.firstName}
			resetUrl={params.resetUrl}
			expiresInMinutes={params.expiresInMinutes}
		/>,
	);
	return sendSafe({
		to: params.to,
		subject: "Reset your Nutrifriz password",
		html,
	});
}
