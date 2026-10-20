import { Heading, Section, Text } from "react-email";
import { BaseLayout } from "../base-layout";

interface Props {
	orderNumber: string;
	customerName: string;
}

export function OrderProcessingEmail({ orderNumber, customerName }: Props) {
	return (
		<BaseLayout preview={`We're preparing order ${orderNumber}`}>
			<Section style={styles.content}>
				<Heading style={styles.heading}>
					We&apos;re preparing your order
				</Heading>
				<Text style={styles.paragraph}>Hi {customerName},</Text>
				<Text style={styles.paragraph}>
					Order <strong>{orderNumber}</strong> is now being prepared by our
					team. We&apos;ll email you again the moment it ships with tracking
					details.
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
