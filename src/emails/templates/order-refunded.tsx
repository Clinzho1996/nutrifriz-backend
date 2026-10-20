import { Heading, Section, Text } from "react-email";
import { formatNaira } from "../../utils/format";
import { BaseLayout } from "../base-layout";

interface Props {
	orderNumber: string;
	customerName: string;
	amount: number;
}

export function OrderRefundedEmail({
	orderNumber,
	customerName,
	amount,
}: Props) {
	return (
		<BaseLayout preview={`Refund issued for order ${orderNumber}`}>
			<Section style={styles.content}>
				<Heading style={styles.heading}>Refund issued</Heading>
				<Text style={styles.paragraph}>Hi {customerName},</Text>
				<Text style={styles.paragraph}>
					We&apos;ve processed a refund of{" "}
					<strong>{formatNaira(amount)}</strong> for order{" "}
					<strong>{orderNumber}</strong>.
				</Text>
				<Text style={styles.paragraph}>
					Depending on your bank, the refund may take 5–10 business days to
					appear on your statement.
				</Text>
				<Text style={styles.small}>— The Nutrifriz team</Text>
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
