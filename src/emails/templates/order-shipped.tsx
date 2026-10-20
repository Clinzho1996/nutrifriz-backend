import { Button, Heading, Section, Text } from "react-email";
import { BaseLayout } from "../base-layout";

interface Props {
	orderNumber: string;
	customerName: string;
	courier?: string;
	trackingNo?: string;
}

export function OrderShippedEmail({
	orderNumber,
	customerName,
	courier,
	trackingNo,
}: Props) {
	return (
		<BaseLayout preview={`Order ${orderNumber} has shipped`}>
			<Section style={styles.content}>
				<Heading style={styles.heading}>Your order is on its way</Heading>
				<Text style={styles.paragraph}>Hi {customerName},</Text>
				<Text style={styles.paragraph}>
					Order <strong>{orderNumber}</strong> has shipped.
				</Text>

				{(courier || trackingNo) && (
					<Section style={styles.trackingBox}>
						{courier && (
							<Text style={styles.label}>
								Courier: <strong>{courier}</strong>
							</Text>
						)}
						{trackingNo && (
							<Text style={styles.label}>
								Tracking number: <strong>{trackingNo}</strong>
							</Text>
						)}
					</Section>
				)}

				<Section style={styles.cta}>
					<Button
						href="https://nutrifriz.com/account/orders"
						style={styles.button}>
						Track my order
					</Button>
				</Section>

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
	trackingBox: {
		background: "#FBF8F1",
		borderRadius: "8px",
		padding: "16px",
		margin: "20px 0",
	},
	label: { color: "#1A1F1A", fontSize: "14px", margin: "4px 0" },
	cta: { textAlign: "center" as const, margin: "28px 0" },
	button: {
		backgroundColor: "#3B7734",
		borderRadius: "999px",
		color: "#ffffff",
		display: "inline-block",
		fontSize: "15px",
		fontWeight: "500",
		padding: "14px 32px",
		textDecoration: "none",
	},
	small: { color: "#6B726B", fontSize: "14px", marginTop: "24px" },
};
