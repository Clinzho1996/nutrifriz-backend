import { Heading, Section, Text } from "react-email";
import { BaseLayout } from "../base-layout";

interface Props {
	orderNumber: string;
	customerName: string;
	reason?: string;
}

export function OrderCancelledEmail({
	orderNumber,
	customerName,
	reason,
}: Props) {
	return (
		<BaseLayout preview={`Order ${orderNumber} was cancelled`}>
			<Section style={styles.content}>
				<Heading style={styles.heading}>Your order was cancelled</Heading>
				<Text style={styles.paragraph}>Hi {customerName},</Text>
				<Text style={styles.paragraph}>
					Order <strong>{orderNumber}</strong> has been cancelled.
					{reason ? ` ${reason}` : ""}
				</Text>
				<Text style={styles.paragraph}>
					If you paid online, a refund (if applicable) will be processed to your
					original payment method within 5–10 business days.
				</Text>
				<Text style={styles.small}>
					Questions? Reply to this email or reach us at hello@nutrifriz.com.
				</Text>
			</Section>
		</BaseLayout>
	);
}

const styles = {
	content: { padding: "40px" },
	heading: {
		color: "#1A1F1A",
		fontSize: "24px",
		fontWeight: "600",
		margin: "0 0 20px",
	},
	paragraph: {
		color: "#4A514A",
		fontSize: "15px",
		lineHeight: "1.6",
		margin: "0 0 12px",
	},
	small: { color: "#6B726B", fontSize: "14px", marginTop: "24px" },
};
