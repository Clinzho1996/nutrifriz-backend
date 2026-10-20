import { Button, Heading, Section, Text } from "react-email";
import { BaseLayout } from "../base-layout";

interface Props {
	orderNumber: string;
	customerName: string;
}

export function OrderDeliveredEmail({ orderNumber, customerName }: Props) {
	return (
		<BaseLayout preview={`Order ${orderNumber} was delivered`}>
			<Section style={styles.content}>
				<Heading style={styles.heading}>Delivered — enjoy the crunch</Heading>
				<Text style={styles.paragraph}>Hi {customerName},</Text>
				<Text style={styles.paragraph}>
					Order <strong>{orderNumber}</strong> was delivered. We hope it lives
					up to the crunch.
				</Text>
				<Text style={styles.paragraph}>
					If you have a moment, a review from you helps other customers decide.
				</Text>
				<Section style={styles.cta}>
					<Button
						href="https://nutrifriz.com/account/orders"
						style={styles.button}>
						Leave a review
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
